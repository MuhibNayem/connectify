export interface Reaction {
	user_id: string;
	emoji: string;
	timestamp: string;
}

export interface Message {
	id: string;
	sender_id: string;
	sender_name?: string;
	receiver_id?: string;
	group_id?: string;
	group_name?: string;
	content: string;
	content_type: string;
	media_urls?: string[];
	seen_by?: string[];
	delivered_to?: string[];
	_optimistic_files?: File[];
	is_deleted: boolean;
	deleted_at?: string;
	is_edited?: boolean; // Added
	edited_at?: string; // Added
	reactions?: Reaction[];
	reply_to_message_id?: string; // Added
	created_at: string;
	updated_at?: string;
	// Potentially add sender/receiver/group objects if populated by backend
	sender?: {
		id: string;
		username: string;
		avatar?: string;
		full_name?: string;
	};
}

export interface WebSocketEvent {
	type: string;
	data: any;
}

export interface ReactionEvent {
	message_id: string;
	user_id: string;
	emoji: string;
	action: 'add' | 'remove';
	timestamp: string;
}

export interface ReadReceiptEvent {
	message_ids: string[];
	reader_id: string;
	timestamp: string;
}

export interface MessageEditedEvent {
	message_id: string;
	editor_id: string;
	new_content: string;
	edited_at: string;
}

export interface MessageCreatedEvent extends Message { }

export interface User {
	id: string;
	username: string;
	email: string;
	avatar?: string;
	full_name?: string;
}
