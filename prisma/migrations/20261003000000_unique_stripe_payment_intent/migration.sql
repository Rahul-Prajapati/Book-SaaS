CREATE UNIQUE INDEX `payment_transactions_stripe_payment_intent_id_key`
ON `payment_transactions`(`stripe_payment_intent_id`);
