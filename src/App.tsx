import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./hooks/ScrollToTop";
import GoToTopButton from "./components/GoToTopButton";
import AppRoutes from "./routes/AppRoutes";
import AppProviders from "./context/AppProviders";
import TwoFactorGate from "./components/TwoFactorGate";
import "../locale/i18n";

function App() {
  return (
    <AppProviders>
      <Router>
        <TwoFactorGate>
          <div className="min-h-screen flex flex-col bg-black">
            <Header />
            <main className="grow">
              <ScrollToTop />
              <AppRoutes />
            </main>
            <GoToTopButton />
            <Footer />
          </div>
        </TwoFactorGate>
      </Router>
    </AppProviders>
  );
}

export default App;