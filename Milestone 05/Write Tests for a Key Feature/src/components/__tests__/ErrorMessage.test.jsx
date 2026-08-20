import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorMessage from '../ErrorMessage';

describe('ErrorMessage', () => {
  describe('happy path', () => {
    // Protects the feedback contract that the user sees the error supplied by the caller.
    test('renders the message prop text', () => {
      render(<ErrorMessage message="Network error" />);

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Protects the recovery path that lets users retry a failed operation.
    test('renders a Try again button and calls onRetry when clicked', async () => {
      const onRetry = jest.fn();
      const user = userEvent.setup();

      render(<ErrorMessage message="Could not load orders" onRetry={onRetry} />);
      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    // Protects against offering a recovery action when no retry behavior was provided.
    test('does not render a retry button without onRetry', () => {
      render(<ErrorMessage message="Something went wrong" />);

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });
});

