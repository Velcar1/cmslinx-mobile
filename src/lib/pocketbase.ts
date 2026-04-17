import PocketBase from 'pocketbase';

// Initialize the PocketBase client.
// Point this to your PocketBase URL via .env or use the default localhost.
const pbUrl = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090';
export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);

export type UserRole = 'superadmin' | 'admin' | 'content_manager' | 'viewer';

export interface User {
    id: string;
    email: string;
    username: string;
    name: string;
    avatar: string;
    role: UserRole;
    organization?: string;
    created?: string;
    updated?: string;
    expand?: {
        organization?: Organization;
    };
}

export interface Organization {
    id: string;
    name: string;
    created?: string;
    updated?: string;
}

export interface DeviceGroup {
    id: string;
    name: string;
    organization: string;
    created?: string;
    updated?: string;
}

export interface Device {
    id: string;
    name: string;
    pairing_code: string;
    is_registered: boolean;
    group: string;
    organization: string;
    expand?: {
        group?: {
            name: string;
        }
    }
}

export interface Media {
    id: string;
    name: string;
    file: string;
    organization: string;
    created?: string;
    updated?: string;
}

export interface Playlist {
    id: string;
    name: string;
    organization: string;
    created?: string;
    updated?: string;
}

export interface PlaylistItem {
    id: string;
    playlist: string;
    media: string;
    duration: number;
    sort_order: number;
    created?: string;
    updated?: string;
    expand?: {
        media?: Media;
    };
}

export interface PWAConfig {
    id: string;
    content_type: 'video_interactive' | 'video_only' | 'image_only' | 'web_only' | 'playlist' | 'url_only' | 'html_only';
    media?: string;
    playlist?: string;
    interactive_image?: string;
    redirect_url: string;
    name_schedule?: string;
    is_schedule?: boolean;
    schedule_start?: string;
    schedule_end?: string;
    organization: string;
    group: string;
    created?: string;
    updated?: string;
    expand?: {
        media?: Media;
        playlist?: Playlist;
        interactive_image?: Media;
    };
}

export interface DeviceHeartbeat {
    id: string;
    device: string;
    group: string;
    organization: string;
    status: 'online' | 'offline' | 'error';
    created?: string;
    updated?: string;
    expand?: {
        device?: Device;
        group?: DeviceGroup;
        organization?: Organization;
    };
}
