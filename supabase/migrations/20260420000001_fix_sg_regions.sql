-- Fix all SG outlet region assignments to match actual Singapore geographic regions.
-- AF's own website had many cross-region placements (e.g. Wave 9 in Woodlands listed
-- as "Central", City Hall listed as "North East", Clementi as "North East", etc.).
-- This migration corrects all 162 outlets to their proper geographic regions.
--
-- Region definitions used:
--   Central    : CBD, Orchard, Novena, Toa Payoh, Bishan, Thomson, Kallang, MacPherson, Queenstown
--   North East : AMK, Hougang, Serangoon, Sengkang, Punggol, Seletar, Lower Peirce
--   North West : Woodlands, Sembawang, Yishun, Marsiling, CCK, Bukit Panjang, Bukit Batok, Tengah
--   South East : Bedok, Tampines, Pasir Ris, Changi, Geylang, Paya Lebar, East Coast, Marine Parade
--   South West : Jurong, Clementi, Alexandra, Telok Blangah, HarbourFront, Sentosa, Buona Vista

-- ─── CENTRAL ────────────────────────────────────────────────────────────────
-- Move to Central: City Hall (was NE), Cecil St / Havelock / Raffles / Stevens /
--   Upper Cross / Sentosa-Martin (all were SE),
--   Buona Vista / Cantonment / City Square Mall / Geylang Bahru /
--   Marymount CC / Tiong Bahru Plaza (all were SW)
UPDATE public.locations SET region = 'Central'
WHERE country = 'SG' AND name IN (
  'City Hall',
  'Cecil Street',
  'Havelock Outram',
  'Raffles Place',
  'Stevens',
  'Upper Cross Street',
  'Buona Vista',
  'Cantonment Road',
  'City Square Mall (City Square Mall)',
  'Geylang Bahru',
  'Marymount CC',
  'Tiong Bahru Plaza'
);

-- Sentosa Martin Road specifically (Robertson Quay area, lat > 1.28)
UPDATE public.locations SET region = 'Central'
WHERE country = 'SG' AND name = 'Sentosa' AND lat > 1.28;

-- ─── NORTH EAST ─────────────────────────────────────────────────────────────
-- Move to NE: AMK / Buangkok / Hougang outlets / Kebun Baru / Lentor / Nex /
--   Serangoon Gardens / The Burghley / Upper Serangoon (all were Central),
--   Lower Peirce (was NW), Ang Mo Kio South (was SE)
UPDATE public.locations SET region = 'North East'
WHERE country = 'SG' AND name IN (
  'Ang Mo Kio',
  'Ang Mo Kio 548',
  'Ang Mo Kio South',
  'Buangkok',
  'Greenwich',
  'Hougang 915',
  'Hougang CC',
  'Hougang Central',
  'Hwi Yoh',
  'Kebun Baru CC',
  'Kovan',
  'Lentor Modern',
  'Lower Peirce',
  'New Tech Park',
  'Nex',
  'Northshore Plaza',
  'Punggol Oasis',
  'Punggol Waterway',
  'SKH Campus',
  'Sengkang Rivervale',
  'Serangoon Gardens',
  'The Burghley',
  'Upper Serangoon'
);

-- ─── NORTH WEST ─────────────────────────────────────────────────────────────
-- Move to NW: Bukit Panjang CC / HillV2 / Wave 9 / Woodlands 11 (were Central),
--   Admiralty / Bukit Batok (Le Quest) / Chong Pang / Gambas / Junction 9 /
--   Khoo Teck Puat / Marsiling CC / Northpoint City / Woods Square / Yishun East
--   (all were NE), Bukit Batok Connection (was SE)
UPDATE public.locations SET region = 'North West'
WHERE country = 'SG' AND name IN (
  'Admiralty',
  'Anytime Fitness Tengah',
  'Bukit Batok (Le Quest)',
  'Bukit Batok Connection',
  'Bukit Panjang CC',
  'CSC Bukit Batok',
  'Choa Chu Kang (Choa Chu Kang)',
  'Choa Chu Kang Centre',
  'Chong Pang',
  'Gambas',
  'HillV2',
  'Hong Kah North CC',
  'Junction 9',
  'Khoo Teck Puat Hospital',
  'Marsiling CC',
  'Marsiling MRT',
  'Northpoint City',
  'Parc Point',
  'Sembawang',
  'Sunshine Place',
  'Teck Whye',
  'Wave 9',
  'Wisteria',
  'Woodgrove',
  'Woodlands',
  'Woodlands 11',
  'Woodlands North',
  'Woods Square',
  'Yew Tee',
  'Yew Tee 614',
  'Yishun East'
);

-- ─── SOUTH EAST ─────────────────────────────────────────────────────────────
-- Move to SE: Bedok 200N / Bedok Central / Eastwood / Simpang / Still / Tampines
--   487 / Tampines North (were Central),
--   Bedok 510 / Changi CP / Elias / Loyang / Pasir Ris / Tampines / Tampines
--   Central / Tampines North / Tampines West / Upper Changi (were NE),
--   Bedok South CC / Siglap CC (were SW)
UPDATE public.locations SET region = 'South East'
WHERE country = 'SG' AND name IN (
  '537 Bedok North',
  'Anytime Fitness Aljunied 119',
  'Bedok 200 North Avenue',
  'Bedok 510',
  'Bedok 85',
  'Bedok Central',
  'Bedok South CC',
  'Chai Chee',
  'Changi City Point',
  'Eastpoint Mall',
  'Eastwood Centre',
  'Elias CC',
  'Geylang',
  'Geylang Central',
  'Grantral Complex',
  'Guillemard',
  'Joo Chiat',
  'Kaki Bukit',
  'Katong',
  'Kembangan',
  'Loyang Point',
  'MacPherson',
  'Marine Parade',
  'Mountbatten',
  'Pasir Ris E!Hub',
  'Paya Lebar',
  'Siglap Community Centre',
  'Simpang Bedok',
  'Still Road',
  'Tampines',
  'Tampines 487',
  'Tampines Central',
  'Tampines East Tampines Mart',
  'Tampines Grande',
  'Tampines North',
  'Tampines West',
  'Upper Changi'
);

-- ─── SOUTH WEST ─────────────────────────────────────────────────────────────
-- Move to SW: Alexis / HarbourFront (were SE),
--   Keppel (was Central), Clementi 354 (was NE), NTU (was NW)
UPDATE public.locations SET region = 'South West'
WHERE country = 'SG' AND name IN (
  'Alexis',
  'Boon Lay',
  'Bukit Merah',
  'Clementi 354',
  'Clementi City',
  'Depot Heights',
  'HarbourFront',
  'Jurong',
  'Jurong East Central',
  'Jurong Point',
  'Jurong Summit',
  'Jurong West (Nanyang)',
  'Keppel',
  'Labrador View',
  'NTU',
  'Pasir Panjang',
  'Pioneer Mall',
  'Taman Jurong',
  'Telok Blangah',
  'West Coast',
  'd''Arena Jurong'
);

-- Sentosa Cove stays South West (already SW, no change needed but explicit for clarity)
UPDATE public.locations SET region = 'South West'
WHERE country = 'SG' AND name = 'Sentosa' AND lat < 1.28;
