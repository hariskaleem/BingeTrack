import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User, ArrowRight, Loader2 } from "lucide-react";
import AuthLayout, { Field, PasswordField } from "./AuthLayout";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function getStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getStrength(form.password), [form.password]);

  const update = (e) => {
    const { name, type, value, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
    setFormError("");
  };

  const validate = () => {
    const er = {};
    if (form.username.trim().length < 3) er.username = "Username must be at least 3 characters";
    if (!EMAIL_RE.test(form.email)) er.email = "Enter a valid email address";
    if (form.password.length < 8) er.password = "Password must be at least 8 characters";
    if (form.confirm !== form.password) er.confirm = "Passwords do not match";
    if (!form.terms) er.terms = "You must accept the terms to continue";
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
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
      title="Create your account"
      subtitle="Start tracking your shows in under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-link">
            Sign in
          </Link>
        </>
      }>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="form-alert">{formError}</div>}

        <Field
          id="username"
          name="username"
          label="Username"
          icon={User}
          placeholder="bingewatcher42"
          autoComplete="username"
          value={form.username}
          onChange={update}
          error={errors.username}
        />

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

        <div>
          <PasswordField
            id="password"
            name="password"
            label="Password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={form.password}
            onChange={update}
            error={errors.password}
          />
          {form.password && (
            <div className="strength">
              <div className="strength-bars">
                {[1, 2, 3, 4].map((n) => (
                  <i key={n} className={strength >= n ? `on-${strength}` : ""} />
                ))}
              </div>
              <small>Strength: {STRENGTH_LABELS[strength]}</small>
            </div>
          )}
        </div>

        <PasswordField
          id="confirm"
          name="confirm"
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update}
          error={errors.confirm}
        />

        <div>
          <label className="check">
            <input type="checkbox" name="terms" checked={form.terms} onChange={update} />
            <span>
              I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>
            </span>
          </label>
          {errors.terms && <p className="field-error">{errors.terms}</p>}
        </div>

        <button type="submit" className="btn-primary btn-block" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={16} className="spin" />
              Creating account…
            </>
          ) : (
            <>
              Create Account <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
