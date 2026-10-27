# Historical railway observations

Source: [pjay-in/indian-railways-delays](https://huggingface.co/datasets/pjay-in/indian-railways-delays), config `2026-10-10_`, file `data/2026/10/2026-10-25.parquet`. Publisher: pjay-in. License shown on the dataset page: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Downloaded 27 October 2026.

The publisher says this config was collected from completed NTES (CRIS) runs. The one downloaded daily file contains 153,006 stop rows for runs completed on 25 October 2026; their start dates may be earlier. `scripts/select_data.py` derives `selected/ntes_2026-10-25_6trains.json`: 258 stops across two completed runs for each of six trains, with run quality at least 0.98 and an actual arrival or departure at every selected stop. This small selection is used for the local dashboard.

The source includes train names and station codes, but no station names, cities, states, zones, or distances. The importer stores station codes as display names and marks location and zone as `Unknown`; it leaves `route_stop` empty. It does not invent route distances or passenger complaints. The source's `arrival_reported` and `departure_reported` fields identify estimates; a run quality under 1 means some times may be estimated. RailPulse recomputes delay from the provided timestamps rather than importing the source's delay columns. These are historical observations, not live train status.

SHA-256 of downloaded Parquet: `53c20cd748f9c2a9ca120ba8375953e855ff80edbd3b73a934a701f5e764bc14`.
