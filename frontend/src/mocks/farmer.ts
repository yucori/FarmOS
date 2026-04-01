import type { FarmerProfile } from '@/types';

export const FARMER_PROFILE: FarmerProfile = {
  id: 'farmer-001',
  name: '김사과',
  age: 67,
  farmName: '김사과 사과농장',
  region: '경북 영주시',
  crops: [
    { name: '사과', variety: '홍로', areaPyeong: 3300 },
    { name: '사과', variety: '부사', areaPyeong: 2200 },
  ],
  registrationDate: '2024-03-15',
  phone: '010-1234-5678',
  insuranceId: 'INS-2024-00123',
  avatar: '/images/farmer-avatar.jpg',
};
