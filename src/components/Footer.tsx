import { Link } from "react-router-dom";
import { SiFacebook, SiDiscord, SiX } from "@icons-pack/react-simple-icons";
import { FormikHelpers, Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import emailjs from "emailjs-com";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";

function Footer() {
  const { t, i18n } = useTranslation();
  const { userSettings } = useAuth();
  const currentYear = new Date().getFullYear();
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (userSettings?.language) {
      i18n.changeLanguage(userSettings.language);
    }
  }, [userSettings, i18n]);

  const initialValues = {
    name: "",
    email: "",
    subject: "",
    message: "",
  };

  const validationSchema = Yup.object({
    name: Yup.string().required(t("name_required")),
    email: Yup.string()
      .email(t("email_invalid"))
      .required(t("email_required")),
    subject: Yup.string().required(t("subject_required")),
    message: Yup.string().required(t("message_required")),
  });

  const handleSubmit = (
    values: typeof initialValues,
    helpers: FormikHelpers<typeof initialValues>
  ) => {
    setIsSending(true);

    const serviceID = "service_adqn9uo";
    const templateID = "template_cz8xreq";
    const publicKey = "tMcR_SLbo1jZiNx9D";

    emailjs
      .send(serviceID, templateID, values, publicKey)
      .then(() => {
        setSent(true);
        helpers.resetForm();
      })
      .catch((error) => {
        console.error("Помилка надсилання:", error);
      })
      .finally(() => {
        setIsSending(false);
      });
  };

  return (
    <footer className="bg-neutral-950 text-white px-6 py-12 font-mono border-t border-lime-500/30">
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        {/* Про нас */}
        <div>
          <h3 className="text-lime-400 text-base uppercase tracking-wide mb-4">
            {t("about_us")}
          </h3>
          <p className="text-neutral-400 leading-relaxed">
            {t("about_us_description")}
          </p>
        </div>

        {/* Контакти / форма */}
        <div>
          <h3 className="text-lime-400 text-base uppercase tracking-wide mb-4">
            {t("contacts")}
          </h3>
          {sent ? (
            <p className="text-green-400">{t("support_success")}</p>
          ) : (
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              <Form className="flex flex-col gap-4">
                <div>
                  <Field
                    name="name"
                    aria-label="Введення ім'я"
                    placeholder={t("name_placeholder")}
                    className="w-full px-3 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm placeholder-neutral-500 uppercase text-sm
                      focus:outline-none focus:border-lime-500 transition-all duration-300"
                  />
                  <ErrorMessage name="name" component="div" className="text-red-500 text-xs mt-1 uppercase" />
                </div>
                <div>
                  <Field
                    name="email"
                    type="email"
                    aria-label="Введення email"
                    placeholder={t("email")}
                    className="w-full px-3 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm placeholder-neutral-500 uppercase text-sm
                      focus:outline-none focus:border-lime-500 transition-all duration-300"
                  />
                  <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1 uppercase" />
                </div>
                <div>
                  <Field
                    name="subject"
                    aria-label="Введення теми"
                    placeholder={t("subject")}
                    className="w-full px-3 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm placeholder-neutral-500 uppercase text-sm
                      focus:outline-none focus:border-lime-500 transition-all duration-300"
                  />
                  <ErrorMessage name="subject" component="div" className="text-red-500 text-xs mt-1 uppercase" />
                </div>
                <div>
                  <Field
                    as="textarea"
                    name="message"
                    aria-label="Введення повідомлення"
                    placeholder={t("message_placeholder")}
                    rows={4}
                    className="w-full px-3 py-2 bg-neutral-900/50 border border-lime-500/50 text-lime-400 rounded-sm placeholder-neutral-500 uppercase text-sm
                      resize-none focus:outline-none focus:border-lime-500 transition-all duration-300"
                  />
                  <ErrorMessage name="message" component="div" className="text-red-500 text-xs mt-1 uppercase" />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="bg-lime-500/10 border border-lime-500 text-lime-400 text-sm px-4 py-2 rounded-sm uppercase
                    hover:bg-lime-500 hover:text-black transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
                >
                  {isSending ? (
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-lime-400 border-t-transparent"></span>
                  ) : (
                    t("submit")
                  )}
                </button>
              </Form>
            </Formik>
          )}
        </div>

        {/* Політика */}
        <div>
          <h3 className="text-lime-400 text-base uppercase tracking-wide mb-4">
            {t("policy")}
          </h3>
          <ul className="space-y-2">
            <li>
              <Link to="/privacy-policy" className="text-neutral-400 hover:text-lime-500 uppercase transition-colors duration-300">
                {t("privacy_policy")}
              </Link>
            </li>
            <li>
              <Link to="/terms-of-use" className="text-neutral-400 hover:text-lime-500 uppercase transition-colors duration-300">
                {t("terms_of_use")}
              </Link>
            </li>
          </ul>
        </div>

        {/* Допомога */}
        <div>
          <h3 className="text-lime-400 text-base uppercase tracking-wide mb-4">
            {t("help")}
          </h3>
          <ul className="space-y-2">
            <li>
              <Link to="/faq" className="text-neutral-400 hover:text-lime-500 uppercase transition-colors duration-300">
                {t("faq")}
              </Link>
            </li>
            <li>
              <Link to="/support" className="text-neutral-400 hover:text-lime-500 uppercase transition-colors duration-300">
                {t("support")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Соціальні мережі */}
      <div className="flex justify-center gap-8 mt-10">
        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-500 transition-transform duration-300 transform hover:scale-110">
          <SiFacebook size={24} />
        </a>
        <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-500 transition-transform duration-300 transform hover:scale-110">
          <SiX size={24} />
        </a>
        <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-500 transition-transform duration-300 transform hover:scale-110">
          <SiDiscord size={24} />
        </a>
      </div>

      <p className="text-center text-neutral-400 text-xs mt-8 uppercase tracking-wide">
        {t("copyright", { year: currentYear })}
      </p>
    </footer>
  );
}

export default Footer;