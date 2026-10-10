import { EventId } from '../types';
export const eventBackground = (id: EventId): string => ({ngay_hoi:'bg_ngayhoitruong.png',cho_xuan:'bg_choxuan.png',ky_yeu:'bg_kyyeu.png'}[id]);
