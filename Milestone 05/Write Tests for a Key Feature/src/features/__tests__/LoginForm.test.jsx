import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from '../LoginForm';
import * as api from '../../api/auth';

jest.mock('../../api/auth');

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    // Protects the primary login contract that users can find both fields and the submit action.
    test('renders email, password, and Sign In controls', () => {
      render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LoginForm />
        </MemoryRouter>,
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    // Protects against a refactor submitting stale or incorrectly mapped credential values.
    test('calls loginUser with the entered email and password', async () => {
      api.loginUser.mockResolvedValue({ user: { email: 'aisha@example.com' } });
      const user = userEvent.setup();

      render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LoginForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText(/email/i), 'aisha@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(api.loginUser).toHaveBeenCalledWith({
          email: 'aisha@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('failure cases', () => {
    // Protects against swallowing an authentication failure that the user needs to correct.
    test('shows the API error message when credentials are rejected', async () => {
      api.loginUser.mockRejectedValue(new Error('Invalid credentials'));
      const user = userEvent.setup();

      render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LoginForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    });

    // Protects against allowing duplicate submissions while the authentication request is pending.
    test('disables the submit button and shows Loading while the API is pending', async () => {
      let resolveLogin;
      const pendingLogin = new Promise((resolve) => {
        resolveLogin = resolve;
      });
      api.loginUser.mockReturnValue(pendingLogin);
      const user = userEvent.setup();

      render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LoginForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText(/email/i), 'aisha@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      const submitButton = screen.getByRole('button', { name: /loading/i });
      expect(submitButton).toBeDisabled();

      resolveLogin({ user: { email: 'aisha@example.com' } });
      await waitFor(() => expect(api.loginUser).toHaveBeenCalledTimes(1));
    });
  });

  describe('edge cases', () => {
    // Protects against sending incomplete credentials to the authentication API.
    test('does not call the API when the form fields are empty', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LoginForm />
        </MemoryRouter>,
      );

      await user.click(screen.getByRole('button', { name: /sign in/i }));

      expect(api.loginUser).not.toHaveBeenCalled();
    });
  });
});

