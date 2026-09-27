import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Tv, Bell, BarChart3, BookmarkCheck, Lock, Eye, EyeOff, AlertCircle, Home } from "lucide-react";
import "./binge.css";
import "./Auth.css";

export function Logo() {
  return (
    <Link to="/" className="logo ">
      <div className="logo-mark">
        <Tv />
        <span className="logo-ping" />
      </div>
      <div>
        <span className="logo-name">
          Binge<span className="gradient-text">Track</span>
        </span>
        <span className="logo-tag">MERN TV Engine</span>
      </div>
    </Link>
  );
}

export function Field({ label, icon: Icon, error, right, id, ...inputProps }) {
  return (
    <div className="field">
      <div className={`input-wrap${error ? " invalid" : ""}`}>
        <span className="input-leading">
          <label className="input-label" htmlFor={id}>
            {label}
          </label>
          <Icon className="input-icon" />
        </span>
        <input id={id} aria-invalid={!!error} {...inputProps} />
        {right}
      </div>
      {error && (
        <p className="field-error">
          <AlertCircle />
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props) {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      icon={Lock}
      type={show ? "text" : "password"}
      right={
        <button
          type="button"
          className="toggle-pw"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff /> : <Eye />}
        </button>
      }
    />
  );
}

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="page">
      <div className="ambient">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
        <div className="dots" />
      </div>

      <div className="auth-page">
        {/* Brand panel (desktop only) */}
        <aside className="auth-side">
          <Logo />

          <div>
            <span className="eyebrow">Your TV, organised</span>
            <h2 style={{ marginTop: ".5rem" }}>
              Track every episode. <span className="gradient-text wide">Never lose your place.</span>
            </h2>
            <p className="side-lead">
              One dashboard for every show you watch, with air-date alerts and stats that sync across all your devices.
            </p>

            <div className="perks">
              <div className="perk">
                <i>
                  <BookmarkCheck />
                </i>
                One-tap episode tracking
              </div>
              <div className="perk">
                <i>
                  <Bell />
                </i>
                Instant air-date notifications
              </div>
              <div className="perk">
                <i>
                  <BarChart3 />
                </i>
                Deep watch-time telemetry
              </div>
            </div>
          </div>
        </aside>

        {/* Form area */}
        <main className="auth-main">
          <div className="auth-top">
            <div className="mobile-only">
              <Logo />
            </div>
            <Link to="/" className="back-link" aria-label="Back to home" title="Back to home">
              <Home size={18} strokeWidth={2.25} aria-hidden="true" />
            </Link>
          </div>

          <div className="auth-center">
            <div className="auth-card">
              <div className="auth-panel">
                <h1>{title}</h1>
                <p className="sub">{subtitle}</p>
                {children}
                <p className="auth-switch">{footer}</p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
