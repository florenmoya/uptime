# Amazon RDS certificate bundle

`aws-rds-ap-southeast-1-bundle.pem` is the public Amazon RDS regional CA bundle downloaded on 5 September 2026 from:

https://truststore.pki.rds.amazonaws.com/ap-southeast-1/ap-southeast-1-bundle.pem

It contains public CA certificates, not private keys or application credentials. The database connection uses `sslmode=verify-full` and `sslrootcert=certs/aws-rds-ap-southeast-1-bundle.pem` so TLS validates the certificate chain and database hostname. Application processes must run from the project root, as configured in the startup scripts and systemd units. Copy this directory when deploying to the VM.

Refresh the bundle from the official HTTPS URL when AWS changes its trust roots. Do not disable certificate verification to work around a connection error. Reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html
