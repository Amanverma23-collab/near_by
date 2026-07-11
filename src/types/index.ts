export interface Customer {
  id: string;
  auth_user_id: string;
  full_name: string;
  mobile_number: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string | null;
  mobile_number: string;
  city: string | null;
  category: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export type UserRole = 'customer' | 'vendor' | null;

export interface LocationData {
  city: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  gradient: string;
  subServices: string[];
}
