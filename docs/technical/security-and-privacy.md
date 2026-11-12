# Security, privacy and worker rights

Default to the camera-free IFS task event and explicit check-in workflow. For each site, assess lawful purpose, necessity, proportionality, legitimate expectations and compatibility of reusing existing security footage. Identify the controller/processor and lawful basis. Consent may be unsuitable in employment given the power imbalance. Document applicable notice, consultation and labor-law obligations. Conduct a DPIA where required and review residual risk with the tenant privacy team and counsel before activation. Different jurisdictions may require different policies. [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj), [CNIL workplace video guidance](https://www.cnil.fr/fr/la-videosurveillance-videoprotection-au-travail).

## Safeguards

- Restrict camera field of view to approved gates. Apply masks before detection, discard raw frames by default and limit local track lifetime. Exclude biometric face/gait/helmet identity, continuous productivity scoring and automatic disciplinary use.
- Authenticate outbound gateways, bind tenant/site scope at ingress, rotate credentials and isolate camera networks. Use TLS in transit, managed identities where supported, managed keys where required, and controlled access to secrets.
- Scope worker, manager, support and integration permissions to tenant, site, assignment and purpose. Use tenant-keyed rows, defense-in-depth database policies, scoped Blob access and cross-tenant denial tests. Consider separate deployments or databases for stronger residency/isolation needs.
- Prefer short-lived metadata. Store approved evidence objects privately and verify deletion across lifecycle runs, snapshots, versions, soft deletes and backups. Record exceptions and legal holds with expiry. [Azure Blob lifecycle deletion](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-delete).
- Audit evidence provenance, versioned policies, corrections, authorization, approval and authoritative acknowledgment. Restrict raw access, omit sensitive data from telemetry and exercise tenant-scoped access and deletion requests.
- Keep camera context and named check-in records in separate trust zones. A separately authorized identity service resolves badge/check-in references. Time/site proximity can be personal data after a join and needs its own purpose, access restrictions and retention. No identity inference from generic crossings.
- Provide worker contest and correction paths. Never silently deduct hours, create breaks or allow a model to finalize compensation. Pause vision or writeback without disabling reporting.

Review the code and weights for any selected model. Ultralytics offers AGPL-3.0 and Enterprise licensing. Have the license owner review intended proprietary packaging before selection. No model weights are distributed here. [Ultralytics licensing](https://www.ultralytics.com/license).
