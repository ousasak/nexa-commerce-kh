import React from 'react';
import { ReservationModal, ReservationModalProps } from './ReservationModal';
import { useLanguage } from '../../i18n';
import { ReservationStatus } from '../../types/restaurant';

export type EditReservationDrawerProps = ReservationModalProps;

export const EditReservationDrawer: React.FC<ReservationModalProps> = (props) => {
  const { t } = useLanguage();

  const statusLabels: Record<ReservationStatus, string> = {
    upcoming: t('restaurant.statusUpcoming', 'Upcoming'),
    seated: t('restaurant.statusSeated', 'Seated'),
    completed: t('restaurant.statusCompleted', 'Completed'),
    cancelled: t('restaurant.statusCancelled', 'Cancelled'),
  };

  return <ReservationModal {...props} />;
};

export default EditReservationDrawer;
