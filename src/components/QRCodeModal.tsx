import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  roomCode: string;
  offerPayload: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomCode, offerPayload, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Connect with Practice Partner</h3>
        <p>Have your partner scan this code with Motion or enter code: <strong>{roomCode}</strong></p>
        
        <div className="qr-container">
          <QRCodeSVG value={offerPayload || roomCode} size={200} />
        </div>

        <button className="btn-secondary" onClick={onClose}>
          Close & Return to Practice
        </button>
      </div>
    </div>
  );
};