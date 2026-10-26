# Receipt scan verification

Live scan of the two supplied Waltermart photos on 2026-10-21, using Gemini 3.5 Flash-Lite. Images were resized to a maximum side of 1600 px and JPEG quality 85, matching the app's initial compression settings.

- Paid product rows: 23
- Paid units: 31
- Overlapping rows merged: 19
- Zero-price card row: excluded
- Printed total: ₱2,087.75
- Sum of paid rows: ₱2,087.75
- Difference: ₱0.00

The receipt's 32 purchased items include the zero-price card unit; the 23 paid product rows represent 31 units.

The first run used the unavailable gemini-2.5-flash-lite model and fell back to OCR.space. That fallback misaligned rows and failed to read the total in these tilted photos. Updating the local model setting and default to gemini-3.5-flash-lite restored the main reader; the second live run passed every price, quantity, overlap, and total check. This successful main-reader scan does not establish that the fallback handles these photos correctly.

| # | Product | Quantity | Line total |
| --- | --- | --- | --- |
| 1 | AD FRZN CRABSTICK250GR/40 | 1 | ₱123.00 |
| 2 | KNSUE BCON CUBES 220GR/1 | 1 | ₱92.00 |
| 3 | KKK SCE SOY STD GRD 500ML | 1 | ₱182.50 |
| 4 | *PFS_MAGGI SCE OYSTR300ML | 1 | ₱72.50 |
| 5 | *CF10_KNORR SOUP CRABNCCO | 2 | ₱98.00 |
| 6 | *KC26_MCHIP CHIP NACHO 98 | 1 | ₱25.00 |
| 7 | NSSIN NDL BFCUP 60GR/36 | 1 | ₱35.00 |
| 8 | *CF10_JOLLY MSHRM P&S POU | 2 | ₱41.00 |
| 9 | NSSIN NDL PSTA CRBONARA60 | 4 | ₱70.00 |
| 10 | STIKO WFER JR CHOWFR 380G | 1 | ₱92.00 |
| 11 | NSHIM NDL SHN RMYN 120GR | 1 | ₱262.00 |
| 12 | *CF10_RBSCO CRKR WHL WHT | 1 | ₱68.00 |
| 13 | DM SPSAU GRMT CRBONRA 200 | 2 | ₱87.00 |
| 14 | *CF10_MNTOS CNDY PF SPRMI | 1 | ₱76.00 |
| 15 | DBMNT CNDY LMN CAN 23.8G/ | 1 | ₱75.00 |
| 16 | CREAM FLR CORNSTRCH 200GR | 1 | ₱27.00 |
| 17 | MAYA FLR ALLPRPSE 800GR/1 | 1 | ₱89.00 |
| 18 | MNSTR EDRINK UTRWHTE 355M | 2 | ₱170.00 |
| 19 | MILCU DEO SPORTS 80GR/12 | 1 | ₱114.00 |
| 20 | NIVEA DEO MN INVSBL B&W50 | 1 | ₱114.50 |
| 21 | *CF10_GDNIA LOAF WHT CL 4 | 1 | ₱64.25 |
| 22 | *KC26_JCLBE CHIP HNY BUTT | 1 | ₱50.00 |
| 23 | NSCFE RTDCF MOCHA 180ML/2 | 2 | ₱60.00 |
