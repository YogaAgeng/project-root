import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import LoginPage from '../src/app/login/page';
import apiClient from '../src/lib/axios';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock axios / apiClient
vi.mock('../src/lib/axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders login form completely with all necessary inputs and submit button', () => {
    render(<LoginPage />);

    // a. Render form secara sempurna
    // b. Pastikan elemen input email, password, dan tombol submit ada di dalam DOM
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('handles user typing and successful login with token stored in localStorage', async () => {
    const mockToken = 'mock-jwt-token-xyz123';
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };

    // c. Lakukan mocking pada modul axios (khusus metode POST ke /auth/login)
    apiClient.post.mockResolvedValueOnce({
      data: {
        message: 'Login successful.',
        user: mockUser,
        token: mockToken,
      },
    });

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // d. Simulasikan pengetikan (user event) pada input dan klik tombol submit
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });

    expect(emailInput.value).toBe('user@example.com');
    expect(passwordInput.value).toBe('secret123');

    fireEvent.click(submitButton);

    // e. Berikan asersi bahwa axios.post dipanggil satu kali, dan localStorage.setItem tereksekusi
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'user@example.com',
        password: 'secret123',
      });
    });

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith('token', mockToken);
      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
    });
  });
});
