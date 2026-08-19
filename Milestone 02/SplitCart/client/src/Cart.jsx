import React from 'react';

const Cart = ({ items, onDelete, currentUser, locked }) => {
  return (
    <section className="panel">
      <h3 className="panel-title">Shared Cart</h3>
      {locked && <p className="notice notice-warning">Cart locked after the first payment confirmation.</p>}
      <div className="item-list">
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>No items in the cart yet.</p>
        ) : (
          items.map((item) => {
            const canDelete = !locked && item.addedBy === currentUser;
            return (
              <div key={item.id} className="item-card">
                <div className="item-info">
                  <h4 title={item.name}>{item.name || 'Unnamed Item'}</h4>
                  <span>Added by {item.addedBy}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="item-price" style={{ color: item.price < 0 ? '#ef4444' : '#4f46e5' }}>
                    ${parseFloat(item.price || 0).toFixed(2)}
                  </span>
                  <button
                    className="delete-btn"
                    onClick={() => onDelete(item.id)}
                    title={locked ? 'Cart is locked' : canDelete ? 'Remove item' : 'You can only remove items you added'}
                    disabled={!canDelete}
                    aria-label={`Remove ${item.name}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default Cart;
