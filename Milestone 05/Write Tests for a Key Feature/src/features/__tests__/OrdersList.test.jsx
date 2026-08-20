import { render, screen, waitFor } from '@testing-library/react';
import OrdersList from '../OrdersList';
import * as api from '../../api/orders';

jest.mock('../../api/orders');

describe('OrdersList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('happy path', () => {
    // Protects the core dashboard contract that every returned order is visible to the user.
    test('renders each order name when the API returns orders', async () => {
      api.fetchOrders.mockResolvedValue([
        { id: 1, name: 'Order #1001', date: '2024-01-01', status: 'Delivered' },
        { id: 2, name: 'Order #1002', date: '2024-01-02', status: 'Processing' },
      ]);

      render(<OrdersList />);

      await waitFor(() => {
        expect(screen.getByText('Order #1001')).toBeInTheDocument();
        expect(screen.getByText('Order #1002')).toBeInTheDocument();
      });
    });
  });

  describe('failure cases', () => {
    // Protects against hiding a failed data request without giving the user actionable feedback.
    test('shows an error message when the API rejects', async () => {
      api.fetchOrders.mockRejectedValue(new Error('Network error'));

      render(<OrdersList />);

      expect(
        await screen.findByText(/something went wrong loading your orders/i),
      ).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    // Protects against presenting a blank dashboard when the user has no order history yet.
    test('shows the empty state and no order items for an empty API response', async () => {
      api.fetchOrders.mockResolvedValue([]);

      render(<OrdersList />);

      expect(await screen.findByText(/no orders yet/i)).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});

