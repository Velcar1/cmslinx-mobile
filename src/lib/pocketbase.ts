import PocketBase from 'pocketbase';

// Initialize the PocketBase client.
// Point this to your PocketBase URL via .env or use the default localhost.
const pbUrl = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090';
export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);

export interface PWAConfig {
    id: string;
    content_type: 'video_interactive' | 'video_only' | 'image_only' | 'web_only';
    video_url?: string;
    image_url?: string;
    redirect_url: string;
    created?: string;
    updated?: string;
}
