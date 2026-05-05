const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const cors = require('cors');
const admin = require('firebase-admin');
const QRCode = require('qrcode');
const OTPAuth = require('otpauth');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100 
});

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'GameStoreApp API',
    version: '1.0.0',
    description: 'API for GameStoreApp with Steam authentication and 2FA',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./index.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

const app = express();

// Apply rate limiting middleware to all requests
app.use(limiter);

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: 'your_session_secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const STEAM_API_KEY = 'F0577A7618F5812DF4FF0E4C0A92C2AE';

passport.use(new SteamStrategy({
  returnURL: 'http://localhost:3000/auth/steam/return',
  realm: 'http://localhost:3000/',
  apiKey: STEAM_API_KEY,
}, async (identifier, profile, done) => {
  try {
    const steamId = profile.id;
    const userDoc = admin.firestore().collection('users').doc(steamId);
    const doc = await userDoc.get();

    if (!doc.exists) {
      await userDoc.set({
        steamId: steamId,
        displayName: profile.displayName,
        avatar: profile.photos[2].value,
        profileUrl: profile._json.profileurl,
      });
      await userDoc.collection('settings').doc('preferences').set({
        language: 'uk',
        twoFactorEnabled: false,
      });
    }

    return done(null, { steamId });
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.steamId);
});

passport.deserializeUser(async (steamId, done) => {
  try {
    const userDoc = admin.firestore().collection('users').doc(steamId);
    const doc = await userDoc.get();
    if (doc.exists) {
      done(null, { steamId });
    } else {
      done(new Error('User not found'), null);
    }
  } catch (err) {
    done(err, null);
  }
});

/**
 * @swagger
 * /auth/steam:
 *   get:
 *     summary: Initiate Steam authentication
 *     description: Redirects to Steam for authentication
 *     responses:
 *       302:
 *         description: Redirect to Steam
 */
app.get('/auth/steam', passport.authenticate('steam', { session: true }));

/**
 * @swagger
 * /auth/steam/return:
 *   get:
 *     summary: Steam authentication callback
 *     description: Handles the callback from Steam after authentication
 *     responses:
 *       302:
 *         description: Redirect to frontend with token or error
 */
app.get('/auth/steam/return', passport.authenticate('steam', { session: true }), async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect('http://localhost:5173/auth/steam/callback?error=steam_auth_failed');
    }

    const steamId = req.user.steamId;
    const customToken = await admin.auth().createCustomToken(steamId);

    req.logout((err) => {
      if (err) {
        res.redirect('http://localhost:5173/auth/steam/callback?error=logout_failed');
        return;
      }
      req.session.destroy((err) => {
        if (err) {
          res.redirect('http://localhost:5173/auth/steam/callback?error=session_destroy_failed');
          return;
        }
        res.redirect(`http://localhost:5173/auth/steam/callback?token=${customToken}`);
      });
    });
  } catch (err) {
    res.redirect('http://localhost:5173/auth/steam/callback?error=token_generation_failed');
  }
});

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout user
 *     description: Logs out the user and destroys the session
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out
 *       500:
 *         description: Logout failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destroy failed' });
      }
      res.status(200).json({ message: 'Logged out' });
    });
  });
});

/**
 * @swagger
 * /generate-2fa:
 *   post:
 *     summary: Generate 2FA secret and QR code
 *     description: Generates a TOTP secret and QR code for 2FA setup
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *                 description: User ID
 *                 example: user123
 *     responses:
 *       200:
 *         description: 2FA secret and QR code generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret:
 *                   type: string
 *                   example: JBSWY3DPEHPK3PXP
 *                 qrCodeUrl:
 *                   type: string
 *                   example: data:image/png;base64,...
 *       400:
 *         description: No UID provided
 *       500:
 *         description: Failed to generate 2FA
 */
app.post('/generate-2fa', async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'No UID provided' });
    }

    const secret = new OTPAuth.Secret();
    const totp = new OTPAuth.TOTP({
      issuer: 'GameStoreApp',
      label: `GameStoreApp:${uid}`,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    const qrCodeUrl = await QRCode.toDataURL(totp.toString());
    res.json({ secret: secret.base32, qrCodeUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate 2FA' });
  }
});

/**
 * @swagger
 * /verify-2fa:
 *   post:
 *     summary: Verify 2FA token
 *     description: Verifies the provided TOTP token for 2FA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *                 description: User ID
 *                 example: user123
 *               token:
 *                 type: string
 *                 description: TOTP token
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Token verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Missing UID or token, or 2FA not enabled
 *       500:
 *         description: Failed to verify 2FA
 */
app.post('/verify-2fa', async (req, res) => {
  try {
    const { uid, token } = req.body;
    if (!uid || !token) {
      return res.status(400).json({ error: 'Missing UID or token' });
    }

    const userDoc = admin.firestore().collection('users').doc(uid);
    const settingsDoc = userDoc.collection('settings').doc('preferences');
    const settingsSnap = await settingsDoc.get();

    if (!settingsSnap.exists || !settingsSnap.data().twoFactorSecret) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    const secret = settingsSnap.data().twoFactorSecret;
    const totp = new OTPAuth.TOTP({
      issuer: 'GameStoreApp',
      label: `GameStoreApp:${uid}`,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const isValid = totp.validate({ token, window: 1 });
    if (isValid === null) {
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {});