import React, { useState } from 'react';

const AddItem = ({ onAdd, currentUser, locked }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const numericPrice = Number(price);

    if (!trimmedName) {
      setError('Item name is required');
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError('Enter a price greater than $0.00');
      return;
    }

    setError('');
    try {
      await onAdd({ name: trimmedName, price: numericPrice, addedBy: currentUser });
      setName('');
      setPrice('');
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
    <section className="panel">
      <h3 className="panel-title">
        <span style={{ color: '#008f11' }}>&gt;</span> INJECT_EXPENSE
      </h3>
      {locked && <p className="notice notice-warning">Cart is locked — payment in progress</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="resource-name">RESOURCE_NAME</label>
          <input
            id="resource-name"
            type="text"
            placeholder="[ ENTRY REQUIRED ]"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={locked}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="credit-value">CREDIT_VALUE ($)</label>
          <input
            id="credit-value"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            disabled={locked}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="origin-node">ORIGIN_NODE</label>
          <input id="origin-node" value={currentUser} readOnly />
        </div>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={locked}>COMMIT TO SHARED_POOL</button>
      </form>
    </section>
  );
};

export default AddItem;
