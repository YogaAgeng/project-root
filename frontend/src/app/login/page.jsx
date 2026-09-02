'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import apiClient from '@/lib/axios';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: 'test@example.com', password: 'password' });
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', form);
      const { token, user } = response.data;

      // Simpan JWT token dan metadata user ke localStorage
      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('user', JSON.stringify(user));

      toast.success(`Welcome back, ${user.name}!`);

      // Redirect ke halaman Task Board
      setTimeout(() => {
        router.push('/tasks');
      }, 800);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.errors?.email?.[0] ||
        'Login failed. Check your email and password.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="nexus-page">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#18181b',
            color: '#d4d4d8',
            border: '1px solid #27272a',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'var(--font-bricolage), sans-serif',
          },
          success: { iconTheme: { primary: '#ffffff', secondary: '#18181b' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#18181b' } },
        }}
      />

      {/* Spline 3D Background Layer */}
      <div className="spline-container">
        <iframe
          src="https://my.spline.design/retrofuturismbganimation-Lb3VtL1bNaYUnirKNzn0FvaW/"
          frameBorder="0"
          width="100%"
          height="100%"
          title="3D Background"
          loading="lazy"
        />
      </div>

      {/* Content Layer */}
      <div className="content">
        {/* Login Card */}
        <div className="border-gradient">
          <div className="card-inner">
            {/* Brand */}
            <div className="brand-mark">Nexus</div>

            {/* Header */}
            <h1 className="heading">Log in</h1>
            <p className="subheading">Access your account</p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="nexus-form">
              {/* Email */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="form-input"
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="form-input"
                />
              </div>

              {/* Remember Me */}
              <div className="remember-row">
                <label className="remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="remember-checkbox"
                  />
                  <span>Remember me</span>
                </label>
                <a href="#" className="forgot-link">Forgot password?</a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="submit-btn"
              >
                {isLoading ? (
                  <span className="btn-loading">
                    <svg className="spinner" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="nexus-divider" />

            {/* Footer */}
            <p className="footer-text">
              Don&apos;t have an account?{' '}
              <a href="#" className="signup-link">Sign up</a>
            </p>

            {/* Demo Credentials */}
            <div className="demo-box">
              <p className="demo-title">Demo credentials</p>
              <div className="demo-creds">
                <span>test@example.com</span>
                <span className="demo-separator">·</span>
                <span>password</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .nexus-page {
          position: relative;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          font-family: var(--font-bricolage), sans-serif;
          color: #d4d4d8;
        }

        /* LAYER 1: Spline 3D Background */
        .spline-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          pointer-events: none;
        }
        .spline-container iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        /* LAYER 2: Content */
        .content {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px;
          background: linear-gradient(
            to bottom,
            rgba(10, 10, 10, 0.8),
            rgba(10, 10, 10, 0.9)
          );
        }

        /* LAYER 3: Card Border Gradient */
        .border-gradient {
          position: relative;
          width: 100%;
          max-width: 420px;
          padding: 1px;
          border-radius: 16px;
          background:
            linear-gradient(rgba(10, 10, 10, 0.7), rgba(10, 10, 10, 0.7)) padding-box,
            linear-gradient(90deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)) border-box;
          border: 1px solid transparent;
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.03);
        }

        /* LAYER 4: Card Inner */
        .card-inner {
          background: rgba(0, 0, 0, 0.6);
          border-radius: 15px;
          padding: 40px 36px;
        }

        /* Typography */
        .brand-mark {
          font-size: 22px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.03em;
        }

        .heading {
          font-size: clamp(42px, 7vw, 56px);
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.07em;
          line-height: 1.1;
          margin-top: 24px;
        }

        .subheading {
          font-size: clamp(16px, 3vw, 20px);
          font-weight: 400;
          color: #a1a1aa;
          letter-spacing: -0.02em;
          line-height: 1.3;
          margin-top: 8px;
        }

        /* Form */
        .nexus-form {
          margin-top: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #d4d4d8;
          letter-spacing: -0.015em;
        }

        .form-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid #3f3f46;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          font-family: var(--font-bricolage), sans-serif;
          color: #ffffff;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .form-input::placeholder {
          color: #52525b;
        }
        .form-input:focus {
          border-color: #ffffff;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15);
        }

        /* Remember / Forgot */
        .remember-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .remember-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #a1a1aa;
          cursor: pointer;
        }

        .remember-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid #3f3f46;
          background: rgba(0, 0, 0, 0.4);
          accent-color: #3b82f6;
          cursor: pointer;
        }

        .forgot-link {
          font-size: 14px;
          font-weight: 600;
          color: #a1a1aa;
          text-decoration: none;
          letter-spacing: -0.015em;
        }
        .forgot-link:hover {
          color: #ffffff;
        }

        /* Submit Button */
        .submit-btn {
          width: 100%;
          background: #ffffff;
          color: #000000;
          border: none;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-bricolage), sans-serif;
          cursor: pointer;
          box-shadow:
            0 10px 15px -3px rgba(255, 255, 255, 0.07),
            0 4px 6px -4px rgba(255, 255, 255, 0.05);
        }
        .submit-btn:hover {
          background: #f4f4f5;
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Divider */
        .nexus-divider {
          height: 1px;
          margin: 28px 0;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0.01),
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.01)
          );
        }

        /* Footer */
        .footer-text {
          text-align: center;
          font-size: 14px;
          color: #a1a1aa;
        }

        .signup-link {
          color: #ffffff;
          font-weight: 600;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .signup-link:hover {
          text-decoration: none;
        }

        /* Demo Box */
        .demo-box {
          margin-top: 20px;
          padding: 12px 16px;
          border: 1px solid #27272a;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.3);
        }

        .demo-title {
          font-size: 11px;
          font-weight: 600;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .demo-creds {
          margin-top: 6px;
          font-size: 13px;
          font-family: var(--font-geist-mono), monospace;
          color: #a1a1aa;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .demo-separator {
          color: #3f3f46;
        }
      `}</style>
    </div>
  );
}
