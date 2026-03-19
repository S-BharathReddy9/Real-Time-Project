import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePassword, validateUsername } from '../../utils/validators';
import '../Login/Login.css';
import './Register.css';

export default function Register() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setServerError('');
  };

  const validate = () => {
    const errs = {};
    if (!validateUsername(form.username)) errs.username = 'Username must be 3–20 alphanumeric characters.';
    if (!validateEmail(form.email))       errs.email    = 'Enter a valid email address.';
    if (!validatePassword(form.password)) errs.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirm)   errs.confirm  = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { data } = await register({ username: form.username, email: form.email, password: form.password });
      setUser(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally { setLoading(false); }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb--1" />
        <div className="auth-orb auth-orb--2" />
        <div className="auth-grid" />
      </div>

      <div className="auth-card animate-in" style={{ maxWidth: 440 }}>
        <div className="auth-logo">
          <span className="auth-logo-dot" />
          StreamSphere
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join thousands of streamers — free forever</p>
        </div>

        {serverError && <div className="auth-error">{serverError}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label className="field-label">Username</label>
            <input
              className={`field-input ${errors.username ? 'field-input--error' : ''}`}
              type="text" name="username" placeholder="coolstreamer42"
              value={form.username} onChange={handleChange} autoComplete="username"
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Email address</label>
            <input
              className={`field-input ${errors.email ? 'field-input--error' : ''}`}
              type="email" name="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange} autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input
              className={`field-input ${errors.password ? 'field-input--error' : ''}`}
              type="password" name="password" placeholder="Min. 6 characters"
              value={form.password} onChange={handleChange} autoComplete="new-password"
            />
            {form.password && (
              <div className="strength-bar">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`strength-seg ${i <= strength ? `strength-${strength}` : ''}`} />
                ))}
                <span className="strength-label">
                  {['','Weak','Fair','Good','Strong'][strength]}
                </span>
              </div>
            )}
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="field-group">
            <label className="field-label">Confirm password</label>
            <input
              className={`field-input ${errors.confirm ? 'field-input--error' : ''}`}
              type="password" name="confirm" placeholder="••••••••"
              value={form.confirm} onChange={handleChange} autoComplete="new-password"
            />
            {errors.confirm && <span className="field-error">{errors.confirm}</span>}
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : null}
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
