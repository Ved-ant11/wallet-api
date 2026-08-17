CREATE SCHEMA IF NOT EXISTS wallet;

CREATE TYPE wallet.transaction_type AS ENUM ('credit', 'debit');
CREATE TYPE wallet.transaction_status AS ENUM ('pending', 'success', 'failed');

CREATE TABLE wallet.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet.wallets (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES wallet.users(user_id),
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet.transfers (
    transfer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_wallet_id UUID NOT NULL REFERENCES wallet.wallets(wallet_id),
    receiver_wallet_id UUID NOT NULL REFERENCES wallet.wallets(wallet_id),
    amount NUMERIC(12, 2) NOT NULL,
    status wallet.transaction_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallet.transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallet.wallets(wallet_id),
    type wallet.transaction_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    reference_id UUID NOT NULL REFERENCES wallet.transfers(transfer_id),
    status wallet.transaction_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
