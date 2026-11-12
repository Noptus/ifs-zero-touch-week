# Architecture decision records

All choices are proposals pending pilot validation.

| Decision | Selection | Trade-off and revisit trigger |
| --- | --- | --- |
| Edge vs. cloud | Keep optional camera inference near entrances and send minimal metadata. | Edge deployment, buffering and maintenance are per-site. A separately approved batch path is viable when edge compute cannot meet measured throughput. |
| CPU vs. GPU | Benchmark CPU first. Compare local GPU and AKS GPU using end-to-end costs. | GPU can raise throughput at higher idle and startup costs. Require measured recall, decode-inclusive FPS and memory headroom. |
| Rules vs. ML | Use deterministic reconstruction and validation, then measure whether ranked suggestions help. | Rules abstain on ambiguity. Models add calibration, drift and evaluation work. |
| Event-driven vs. synchronous | Use replayable asynchronous ingest and a synchronous authorization boundary for review actions. | Async state requires deduplication, lag visibility and explicit acknowledgment. A pilot can run with a database outbox. |
| Go vs. Python | Go owns durable business transitions and adapters. Python handles inference and evaluation. | Two runtimes need versioned contracts, separate release controls and end-to-end tracing. |
| Blob vs. S3 | Use private Azure Blob by default for approved evidence. | Optional S3 compatibility adds data movement and deletion obligations. |
| Tenant vs. site configuration | Tenants govern activity, retention and permission policies. Sites set zone geometry and device options within those limits. | Validate precedence and record the effective versions in audit entries. |
| Camera-assisted vs. camera-free | Begin with IFS status and authorized check-ins. Run separately authorized entrance vision only after baseline measurement. | Potential corroboration must outweigh privacy, operational and cost burden. Preserve an accessible camera-free workflow. |
