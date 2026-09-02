#!/bin/bash
# Generates a local self-signed SSL certificate for development HTTPS.
# NOT for production use - a real deployment must use a certificate
# from a trusted CA (e.g. Let's Encrypt).

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout "$DIR/key.pem" \
  -out "$DIR/cert.pem" \
  -subj "/C=ZA/ST=KwaZulu-Natal/L=Durban/O=HustleHub/OU=Dev/CN=localhost"

echo "Certificate generated at $DIR/cert.pem"
echo "Private key generated at $DIR/key.pem"
