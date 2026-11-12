# Capacity planning

The planner accepts editable assumptions. Frame sizes and network costs use decimal units. Its three scenario presets are fictional, and prices are not quotes.

```text
sites = tenants × sites_per_tenant
cameras = sites × cameras_per_site
frames = cameras × sampled_fps × active_hours × 3600
raw_GB_per_day = frames × frame_kB / 1e6
live_upload_Mbps_per_site = cameras_per_site × sampled_fps × frame_kB × 0.008
upload_seconds_per_site = raw_GB_per_day / sites × 8000 / link_Mbps
edge_workers_per_site = ceil(live_fps_per_site / (worker_fps × target_utilization))
cloud_workers = ceil(frames / (worker_fps × target_utilization × useful_seconds))
runtime_seconds = frames / (worker_count × worker_fps × target_utilization)
events_per_day = cameras × active_hours × crossings_per_camera_hour × events_per_crossing
metadata_GB_retained = events_per_day × event_kB / 1e6 × retention_days
cloud_GB_retained = metadata_GB_retained + raw_GB_per_day × retained_fraction × retention_days
```

Useful seconds are the processing window minus startup/teardown. If uploads and inference cannot overlap, subtract upload time as well when choosing the processing window. Each cloud worker's billed hours are the greater of runtime plus startup and the idle floor, bounded to one day in this daily model. Monthly cost uses 30 identical days, shared platform allowance, provisioned or amortized compute, transfer and retained storage. It excludes link protocol overhead, reliability margin beyond utilization, cost variability across days, taxes and platform services beyond the allowance.

**Sample pilot scenario.** Two cameras at 2 fps for 10 hours give 144,000 frames/day. At 90 kB/frame that is 12.96 GB/day and 2.88 Mbps/site during capture. An edge CPU assumed to sustain 12 fps at 70% utilization supplies 8.4 usable fps. One worker covers the 4 fps demand. At 120 fps per GPU, 70% utilization and a 3-hour window with 10 minutes startup, one GPU worker processes the same payload in about 29 minutes, excluding transfer and startup. None of these throughput inputs is a measurement.

## Measurements before choosing a VM

Benchmark fixed camera resolutions and representative ingress with decode, sampling, detection, tracking, buffering and upload enabled. Measure p50/p95 latency, sustained throughput, GPU memory, batch wait, site link and recovery from outage. Compare CPU-only edge, local GPU, cloud CPU and cloud GPU. Select a concrete VM family only after checking region, quota, pricing, supported drivers and measurements.

For a permitted cloud path, use versioned Python Kubernetes Jobs. Request GPU resources, use affinity and taints/tolerations, validate device plugin and driver compatibility, and bound retry and dead-letter behavior. KEDA can scale Jobs from supported backlog metrics. Exercise node autoscaling, idle billing, warm-up and quota failure. Verify scale-to-zero for the actual user pool and measure wake-up under peak. [AKS GPUs](https://learn.microsoft.com/en-us/azure/aks/gpu-cluster), [AKS scaling](https://learn.microsoft.com/en-us/azure/aks/concepts-scale), [KEDA ScaledJob](https://keda.sh/docs/latest/reference/scaledjob-spec/).

## Capture quality

The one-sample proxy `min(1, fps × seconds_visible)` assumes periodic sampling, a random crossing phase and stable visibility. Even one sample may be insufficient for directional tracking. Measure separate entry/exit precision and recall against labeled observations, with day/night, crowding, occlusion and offline slices. Missed events and false entries should lower evidence coverage, leave gaps visible and preserve the check-in alternative.
