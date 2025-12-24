export type Session = {
    id: string;
    token_identifier: string;
    ip_address: string;
    user_agent: string;
    device_type: null,
    location: null,
    is_active: boolean;
    expires_at: Date;
    last_activity_at: Date;
    created_at: Date;
    updated_at: Date;
    current: boolean;
}