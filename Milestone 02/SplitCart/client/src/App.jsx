import React, { useEffect, useState } from 'react';
import { addItem, confirmPayment, deleteItem, fetchCart } from './api';
import Cart from './Cart';
import AddItem from './AddItem';
import PaymentPanel from './PaymentPanel';

function App() {
  const [cart, setCart] = useState({
    items: [],
    participants: [],
    payments: [],
    total: 0,
    share: 0,
    nextShare: 0,
    remainder: 0,
    paymentLocked: false,
  });
  const [currentUser, setCurrentUser] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  const loadCart = async () => {
    const data = await fetchCart();
    setCart(data);
    setCurrentUser((previousUser) => previousUser || data.participants[0] || '');
  };

  useEffect(() => {
    loadCart().catch((loadError) => setError(loadError.message));
  }, []);

  const handleAddItem = async (item) => {
    setError('');
    await addItem(item);
    await loadCart();
  };

  const handleDeleteItem = async (id) => {
    setError('');
    try {
      await deleteItem(id, currentUser);
      await loadCart();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handlePay = async (participant, amount) => {
    setError('');
    try {
      const result = await confirmPayment({ participant, amount });
      setStatus(result);
      await loadCart();
    } catch (paymentError) {
      setError(paymentError.message);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>SPLITCART</h1>
        <p>[ PROTOCOL: EXPENSE_SETTLEMENT_v1.1.0 ]</p>
      </header>

      <div className="control-bar">
        <label htmlFor="active-user">ACTIVE_USER</label>
        <select id="active-user" value={currentUser} onChange={(event) => setCurrentUser(event.target.value)}>
          {cart.participants.map((participant) => <option key={participant} value={participant}>{participant}</option>)}
        </select>
        <span>{cart.paymentLocked ? 'CART_LOCKED' : 'CART_OPEN'}</span>
      </div>

      <div className="notice notice-info">
        <strong>[!] ACCEPTANCE RULES:</strong> items require a positive price, owners can remove only their own items, and the first payment locks the cart.
      </div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="grid">
        <div className="main-content">
          <Cart items={cart.items} onDelete={handleDeleteItem} currentUser={currentUser} locked={cart.paymentLocked} />
          <div style={{ marginTop: '2.5rem' }}>
            <AddItem onAdd={handleAddItem} currentUser={currentUser} locked={cart.paymentLocked} />
          </div>
        </div>

        <aside className="sidebar">
          <PaymentPanel
            participants={cart.participants}
            payments={cart.payments}
            total={cart.total}
            share={cart.share}
            nextShare={cart.nextShare}
            remainder={cart.remainder}
            onPay={handlePay}
            status={status}
            locked={cart.paymentLocked}
            error={error}
          />
        </aside>
      </div>

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: '#008f11', fontSize: '0.7rem', opacity: 0.6 }}>
        &copy; 2026 NEBULA-SYSTEMS | ACCEPTANCE_RULES_ENFORCED
      </footer>
    </div>
  );
}

export default App;
