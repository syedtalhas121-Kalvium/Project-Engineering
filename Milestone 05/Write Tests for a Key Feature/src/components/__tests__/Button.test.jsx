import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  describe('happy path', () => {
    // Protects the button contract that users can see the label provided by the caller.
    test('renders the label prop as the accessible button name', () => {
      render(<Button label="Submit" />);

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    // Protects the interaction contract that clicking an enabled button invokes its handler once.
    test('calls onClick exactly once when the user clicks an enabled button', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button label="Click me" onClick={handleClick} />);
      await user.click(screen.getByRole('button', { name: /click me/i }));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    // Protects against disabled actions accidentally firing when a user clicks a disabled control.
    test('is disabled and does not call onClick when disabled is true', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();

      render(<Button label="Submit" onClick={handleClick} disabled />);
      const button = screen.getByRole('button', { name: /submit/i });

      expect(button).toBeDisabled();
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});

