import React from 'react';

const PaymentPanel = ({ participants, payments, total, share, nextShare, remainder, onPay, status, locked, error }) => {
  const paidCount = payments.length;
  const allPaid = paidCount === participants.length && participants.length > 0;

  return (
    <section className="panel">
      <h3 className="panel-title">
        <span style={{ color: '#008f11' }}>&gt;</span> SETTLEMENT_MATRIX
      </h3>
      <div className="total-display">
        <p style={{ fontSize: '0.8rem', color: '#008f11', letterSpacing: '2px' }}>AGGREGATE_VALUE</p>
        <div className="big-number">${(total || 0).toFixed(2)}</div>
        <p style={{ fontSize: '0.85rem', marginTop: '1rem', color: '#adff2f' }}>
          DIVIDED_BY [ 0x{participants.length.toString(16).padStart(2, '0')} ] NODES: <strong>${(share || 0).toFixed(2)}</strong>
        </p>
        {remainder > 0 && <p className="split-note">Last confirmer covers the ${remainder.toFixed(2)} remainder.</p>}
      </div>

      <div className="participants-list">
        {participants.map((participant) => {
          const payment = payments.find((pay) => pay.participant === participant);
          return (
            <div key={participant} className="participant-row">
              <span style={{ fontWeight: 600, color: '#adff2f' }}>{participant.toUpperCase()}</span>
              {payment ? (
                <span className="pay-tag">PAID ${payment.amount.toFixed(2)}</span>
              ) : (
                <button
                  className="pay-btn"
                  onClick={() => onPay(participant, nextShare || share)}
                  disabled={allPaid}
                >
                  EXEC_PAYMENT
                </button>
              )}
            </div>
          );
        })}
      </div>

      {locked && !allPaid && <p className="notice notice-warning">Payment started. Remaining members must confirm their calculated share.</p>}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {status && (
        <div className={`status-box ${status.isComplete ? 'status-success' : 'status-error'}`}>
          <p><strong>[ STATUS ]:</strong> {status.isComplete ? 'PARITY_REACHED' : 'PENDING_CONFIRMATION...'}</p>
          <div style={{ marginTop: '0.75rem', opacity: 0.8, fontSize: '0.8rem' }}>
            TOTAL_COLLECTED: ${status.totalPaid.toFixed(2)} / ${status.currentTotal.toFixed(2)}
          </div>
        </div>
      )}
    </section>
  );
};

export default PaymentPanel;
