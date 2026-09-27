import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import AuthLayout, { Field, PasswordField } from "./AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", remember: true });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
    setFormError("");
  };

  const validate = () => {
    const er = {};
    if (!EMAIL_RE.test(form.email)) er.email = "Enter a valid email address";
    if (!form.password) er.password = "Password is required";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("bingetrack_token", data.token);
      localStorage.setItem("bingetrack_user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up right where you left off."
      footer={
        <>
          New to BingeTrack?{" "}
          <Link to="/register" className="text-link">
            Create an account
          </Link>
        </>
      }>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="form-alert">{formError}</div>}

        <Field
          id="email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={update}
          error={errors.email}
        />

        <PasswordField
          id="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={form.password}
          onChange={update}
          error={errors.password}
        />

        <div className="auth-row">
          <label className="check">
            <input type="checkbox" name="remember" checked={form.remember} onChange={update} />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn-primary btn-block" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={16} className="spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign In <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
