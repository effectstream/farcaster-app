import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { markReady } from "./miniapp.ts";
import { Home } from "./pages/Home.tsx";
import { CanvasPage } from "./pages/CanvasPage.tsx";

export function App() {
  useEffect(() => {
    // Mandatory: dismiss the splash screen after first render.
    void markReady();
  }, []);

  return (
    <div className="layout">
      <header className="header">
        <h1>
          <a href="/">Canvas</a>
        </h1>
        <span className="muted">Farcaster Mini App</span>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/canvas/:id" element={<CanvasPage />} />
      </Routes>
    </div>
  );
}
