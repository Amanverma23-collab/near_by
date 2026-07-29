export interface VendorService {
  name: string;
  price?: string;
}

export interface VendorReview {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  daysAgo: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  subService: string;
  distanceKm: number;
  address: string;
  isOpenNow: boolean;
  openingHours: string;
  phoneNumber: string;
  whatsappNumber: string;
  rating: number;
  isVerified: boolean;
  imageUrl?: string;
  ownerName: string;
  shopImages: string[];
  latitude: number;
  longitude: number;
  servicesOffered: VendorService[];
  reviews: VendorReview[];
  reviewCount: number;
}

export const dummyVendors: Vendor[] = [];
