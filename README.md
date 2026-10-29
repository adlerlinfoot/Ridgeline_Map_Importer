# Ridgeline Map Importer

A **separate, optional plugin** for [Ridgeline Lift-Line Laboratory](https://github.com/adlerlinfoot/Ridgeline_Lift_Line_Labratory). Upload a resort-map image, have a vision agent read its corner legend and trace a draft graph, edit the overlay, validate, then load it into Ridgeline. The plugin does not replace or fork the simulator.

## Start

Requires Node.js 24 and an installed, normally signed-in Kiro CLI. No dependency installation or API key is needed.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Adler\repo-reviews\Ridgeline_Map_Importer\Start-MapImporter.ps1"
```

Or run `npm start` from this repository. The plugin serves **http://127.0.0.1:43881/**. If this folder is a sibling of the Ridgeline checkout, Ridgeline's Windows launcher also starts the plugin when installed. Otherwise start it separately.

In updated Ridgeline, click **Image → topology plugin**. You can also use the standalone page and download a topology file for Ridgeline's **Import topology file** button. The plugin's Apply button communicates only with the exact local Ridgeline origin, http://127.0.0.1:43880. Restore Ridgeline returns the simulator to its bundled original map.

## Workflow

1. Upload PNG/JPEG/WebP. The browser resizes the image to a maximum 1920-pixel edge before sending it for visual analysis; it does not OCR equations or replace the image with extracted text.
2. Click **Read image with Kiro**. The existing CLI login/credits are used. Default vision model: `claude-sonnet-4.6`; `RIDGELINE_VISION_MODEL` overrides it.
3. Inspect the image overlay. The agent identifies the key in any corner, lift endpoints, route centerlines, directed descents, walking paths and explicit junctions. It must flag unclear direction/connectivity rather than silently invent links.
4. Move nodes and route bends. Add nodes/routes, change kind/difficulty, split routes at junctions, choose a Main Lodge and resolve image ambiguities. Advanced JSON supports full legend and ID edits. Crossing lines alone never create graph connections.
5. Enter explicit synthetic defaults for unknown scale/capacity/ride duration. Review the legend/directions/connections, then apply or export. Blocking validation errors must be corrected first.

Images are not sufficient to infer measured distances, capacities or elevations that are not printed. Synthetic scale and service defaults are disclosed. For the 3D renderer, relative elevations are normalized to 2350–3100m from the directed descent graph; any supplied source elevations are retained separately. These display heights are not reconstructed terrain. Travel uses polyline arc length and the chosen physical scale.

## Editor tools

- Inspect/move: select a route or node; drag nodes or the selected route's interior handles.
- Add node: click, then set its kind. Base-level walking junctions use `base_junction`; Main Lodge uses `base_lodge`.
- Draw route: select kind/difficulty, click a start node, optional bends, then an end node.
- Split route: click a non-lift route to create a junction and two explicit edges. Connect another route to that same node when a crossing really joins.
- Save editable draft before closing. The image remains browser-local except when explicitly analyzed; it is not included in topology JSON. JSON edits invalidate the review checkbox.

The bundled reference example is generated from the original simulator topology, **not** presented as an AI extraction. Its configured lodge is not printed on the original image; this is disclosed in an example warning.

## Integration contract

`public/core.mjs` defines draft validation and compilation. A reviewed draft compiles to `{protocol:"ridgeline.topology.v1", map, spawnNode, warnings}`. The host accepts messages only from this plugin's exact origin and its known iframe, or from a file explicitly chosen by the user. It independently bounds/validates the payload and preflights class routes before replacing the current map. The original files remain unchanged.

Imported maps support 1–16 lifts with arbitrary IDs and green/blue/black/park runs. Vacationer admissibility derives from complete green/blue itineraries. Park specialists use park-serving lifts; race specialists use the westernmost race-serving lift; general lappers repeat an assigned complete itinerary. If no corresponding park or race exists, those subtype draws become general lappers, explicitly disclosed as a warning. Queue memory, timing, lodge spawn percentage, continuous non-lodge path spawning and population flow remain host simulation rules.

The browser image editor and vision server live here. Ridgeline contains only the host connection and the engine/rendering support needed for generic imported topology. It retains all default-map behavior and the existing repeated-run overlays.

## Privacy and service limits

Only the uploaded image, dimensions and extraction instructions are passed to Kiro through its documented [ACP image prompt protocol](https://kiro.dev/docs/cli/acp/), using the CLI's normal authentication. No credentials are extracted. The dedicated agent has no tools, file resources, MCP servers or hooks. Client tool/permission requests are denied. No external image URLs are fetched, and no clipboard manipulation or desktop automation is used.

The service binds to loopback, checks Host/Origin/custom request headers, bounds upload sizes, runs one analysis at a time, limits new analyses to 12/hour, and cancels the child process when the request is cancelled. It has no automatic model retry. Kiro analysis consumes credits and Kiro may retain conversations under its own policies. Images and extracted drafts are not committed or written by this server; Kiro profile/runtime state lives in ignored `.runtime/`.

## Verification

```powershell
node --test tests/*.test.mjs
```

Tests cover graph/schema safety, direction/stranding checks, ambiguity gating, physical scale, host-independent compilation and HTTP boundaries. An optional live test (uses credits) can be performed through the upload UI. During development an actual image prompt returned a top-left legend and a draft; the validator correctly blocked missing-lodge and connectivity ambiguities. This verifies the vision connection, **not** perfect extraction accuracy. Full rendered browser QA was unavailable; DOM fixtures and real engine integration checks are reported separately.

No deployment, public map upload service or billing account is required. This repository is private by default.

Scale is defined per pixel of the resized analysis image shown in the editor; use its displayed dimensions when deriving a physical scale from a printed distance key.

Applied topologies now retain an editable source draft in their JSON. Ridgeline's Edit current topology button reopens committed maps, including older normalized topology files. Per-lift seat/chair/revolution settings survive the editor round trip. Background images are kept separately in local browser storage when available; portable files remain topology JSON.
