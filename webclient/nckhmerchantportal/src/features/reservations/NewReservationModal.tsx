import React from 'react';
import { ReservationModal, ReservationModalProps } from './ReservationModal';

export type NewReservationModalProps = ReservationModalProps;

export const NewReservationModal: React.FC<ReservationModalProps> = (props) => {
  return <ReservationModal {...props} />;
};

export default NewReservationModal;
