import "@/App.css";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, RequireAuth } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import Shop from "@/pages/Shop";
import Personalize from "@/pages/Personalize";
import Builder from "@/pages/Builder";
import MyCards from "@/pages/MyCards";
import Studio from "@/pages/Studio";
import CardViewer from "@/pages/CardViewer";
import { PaymentSuccess, PaymentCancel } from "@/pages/PaymentResult";

function Shell() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/c/:slug" element={<CardViewer />} />
          <Route element={<Shell />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:id" element={<Personalize />} />
            <Route path="/create" element={<RequireAuth><Builder key="new" mode="card" /></RequireAuth>} />
            <Route path="/create/:cardId" element={<RequireAuth><Builder mode="card" /></RequireAuth>} />
            <Route path="/my-cards" element={<RequireAuth><MyCards /></RequireAuth>} />
            <Route path="/payment/success" element={<RequireAuth><PaymentSuccess /></RequireAuth>} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/studio" element={<RequireAuth admin><Studio /></RequireAuth>} />
            <Route path="/studio/template/:tid" element={<RequireAuth admin><Builder mode="template" /></RequireAuth>} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  );
}

export default App;
