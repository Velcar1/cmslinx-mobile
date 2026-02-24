import PocketBase from 'pocketbase';

// Initialize the PocketBase client.
// Point this to your PocketBase URL via .env or use the default localhost.
const pbUrl = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090';
export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);

export interface PWAConfig {
    id: string;
    video_url: string;
    redirect_url: string;
    created?: string;
    updated?: string;
}
