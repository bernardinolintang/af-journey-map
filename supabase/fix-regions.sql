-- ============================================================
-- FIX SG OUTLET REGIONS
-- Run this in the Supabase SQL Editor (or supabase db push)
-- Corrects all 162 outlets to proper geographic regions.
--
-- Central   : CBD, Orchard, Novena, Toa Payoh, Bishan, Thomson, Kallang, Queenstown
-- North East: AMK, Hougang, Serangoon, Sengkang, Punggol, Seletar
-- North West: Woodlands, Sembawang, Yishun, Marsiling, CCK, Bukit Panjang, Tengah
-- South East: Bedok, Tampines, Pasir Ris, Changi, Geylang, Paya Lebar, East Coast
-- South West: Jurong, Clementi, Alexandra, Telok Blangah, HarbourFront, Sentosa
-- ============================================================

-- CENTRAL
UPDATE public.locations SET region = 'Central'
WHERE country = 'SG' AND name IN (
  -- Staying Central (already correct)
  'Anytime Fitness Balmoral','Balestier','Bishan','Bishan 227','Boon Keng',
  'Bugis','Bukit Merah Central','Bukit Timah','Bukit Timah Central',
  'Cineleisure Orchard','Clarke Quay','Dakota','Dhoby Ghaut','Dunearn',
  'Henderson CC','Holland Village','Jalan Besar','Kallang',
  'Kim Seng Community Centre','MacPherson Mall','New Queensway',
  'New Upper Thomson','Novena','Orchard','Potong Pasir','Rochester',
  'Suntec City','Tanjong Pagar','Tekka Place','The Concourse','Thomson CC',
  'Toa Payoh','VIIO @ BALESTIER','Valley Point','Wheelock Place',
  -- From NE
  'City Hall',
  -- From SE
  'Cecil Street','Havelock Outram','Raffles Place','Stevens','Upper Cross Street',
  -- From SW
  'Buona Vista','Cantonment Road','City Square Mall (City Square Mall)',
  'Geylang Bahru','Marymount CC','Tiong Bahru Plaza'
);
-- Sentosa Martin Road (near Robertson Quay) — distinct from Sentosa Cove
UPDATE public.locations SET region = 'Central'
WHERE country = 'SG' AND name = 'Sentosa' AND lat > 1.28;

-- NORTH EAST
UPDATE public.locations SET region = 'North East'
WHERE country = 'SG' AND name IN (
  -- Staying NE
  'Ang Mo Kio 548','Greenwich','Hougang CC','Hwi Yoh','Kovan',
  'New Tech Park','Northshore Plaza','Punggol Oasis','Punggol Waterway',
  'SKH Campus','Sengkang Rivervale',
  -- From Central
  'Ang Mo Kio','Buangkok','Hougang 915','Hougang Central','Kebun Baru CC',
  'Lentor Modern','Nex','Serangoon Gardens','The Burghley','Upper Serangoon',
  -- From NW
  'Lower Peirce',
  -- From SE
  'Ang Mo Kio South'
);

-- NORTH WEST
UPDATE public.locations SET region = 'North West'
WHERE country = 'SG' AND name IN (
  -- Staying NW
  'Anytime Fitness Tengah','CSC Bukit Batok','Choa Chu Kang (Choa Chu Kang)',
  'Choa Chu Kang Centre','Hong Kah North CC','Marsiling MRT','Parc Point',
  'Sembawang','Sunshine Place','Teck Whye','Wisteria','Woodgrove',
  'Woodlands','Woodlands North','Yew Tee','Yew Tee 614',
  -- From Central
  'Bukit Panjang CC','HillV2','Wave 9','Woodlands 11',
  -- From NE
  'Admiralty','Bukit Batok (Le Quest)','Chong Pang','Gambas','Junction 9',
  'Khoo Teck Puat Hospital','Marsiling CC','Northpoint City','Woods Square','Yishun East',
  -- From SE
  'Bukit Batok Connection'
);

-- SOUTH EAST
UPDATE public.locations SET region = 'South East'
WHERE country = 'SG' AND name IN (
  -- Staying SE
  '537 Bedok North','Anytime Fitness Aljunied 119','Bedok 85','Chai Chee',
  'Eastpoint Mall','Geylang','Geylang Central','Grantral Complex','Guillemard',
  'Joo Chiat','Kaki Bukit','Katong','Kembangan','MacPherson','Marine Parade',
  'Mountbatten','Paya Lebar','Tampines East Tampines Mart','Tampines Grande',
  -- From Central
  'Bedok 200 North Avenue','Bedok Central','Eastwood Centre','Simpang Bedok',
  'Still Road','Tampines 487','Tampines North',
  -- From NE
  'Bedok 510','Changi City Point','Elias CC','Loyang Point','Pasir Ris E!Hub',
  'Tampines','Tampines Central','Tampines West','Upper Changi',
  -- From SW
  'Bedok South CC','Siglap Community Centre'
);

-- SOUTH WEST
UPDATE public.locations SET region = 'South West'
WHERE country = 'SG' AND name IN (
  -- Staying SW
  'Boon Lay','Bukit Merah','Clementi City','Depot Heights','Jurong',
  'Jurong East Central','Jurong Point','Jurong Summit','Jurong West (Nanyang)',
  'Labrador View','Pasir Panjang','Pioneer Mall','Taman Jurong',
  'Telok Blangah','West Coast',
  -- From SE
  'Alexis','HarbourFront',
  -- From Central
  'Keppel',
  -- From NE
  'Clementi 354',
  -- From NW
  'NTU'
);
-- d'Arena has an apostrophe - handle separately
UPDATE public.locations SET region = 'South West'
WHERE country = 'SG' AND name = 'd''Arena Jurong';
-- Sentosa Cove stays South West
UPDATE public.locations SET region = 'South West'
WHERE country = 'SG' AND name = 'Sentosa' AND lat < 1.28;

-- Verify counts (run this SELECT after the updates to confirm)
SELECT region, COUNT(*) as outlet_count
FROM public.locations
WHERE country = 'SG'
GROUP BY region
ORDER BY region;
