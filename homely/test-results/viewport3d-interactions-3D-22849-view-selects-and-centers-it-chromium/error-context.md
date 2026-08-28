# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: viewport3d-interactions.spec.ts >> 3D viewport interactions >> clicking furniture in the 3D view selects and centers it
- Location: e2e/viewport3d-interactions.spec.ts:74:3

# Error details

```
Error: 3D click should select the furniture

expect(received).toContain(expected) // indexOf

Expected value: "furniture-1"
Received array: []
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - button "File" [ref=e5] [cursor=pointer]
    - button "Edit" [ref=e7] [cursor=pointer]
    - button "View" [ref=e9] [cursor=pointer]
    - button "Help" [ref=e11] [cursor=pointer]
  - generic [ref=e12]:
    - generic [ref=e13]:
      - button "Select" [ref=e14] [cursor=pointer]
      - button "Wall" [ref=e15] [cursor=pointer]
      - button "Room" [disabled] [ref=e16]
      - button "Dim" [disabled] [ref=e17]
      - button "Text" [disabled] [ref=e18]
      - button "Furniture" [ref=e19] [cursor=pointer]
    - generic [ref=e21]:
      - button "Undo" [disabled] [ref=e22]
      - button "Redo" [disabled] [ref=e23]
    - generic [ref=e25] [cursor=pointer]:
      - checkbox "Mag" [checked] [ref=e26]
      - text: Mag
    - button "Fit" [ref=e27] [cursor=pointer]
    - generic [ref=e29]:
      - button "Split" [ref=e30] [cursor=pointer]
      - button "Plan" [ref=e31] [cursor=pointer]
      - button "3D" [ref=e32] [cursor=pointer]
    - generic "3D camera angle" [ref=e33]:
      - button "Persp" [ref=e34] [cursor=pointer]
      - button "Top" [ref=e35] [cursor=pointer]
    - button "◐" [ref=e36] [cursor=pointer]
  - generic [ref=e37]:
    - generic [ref=e39]:
      - generic [ref=e40]:
        - generic [ref=e41]: Furniture
        - button "+ Import" [ref=e42] [cursor=pointer]
      - searchbox "Search furniture…" [ref=e44]
      - generic [ref=e45]:
        - button "All" [ref=e46] [cursor=pointer]
        - button "Living 4" [ref=e47] [cursor=pointer]:
          - generic [ref=e48]: Living
          - generic [ref=e49]: "4"
        - button "Bedroom 3" [ref=e50] [cursor=pointer]:
          - generic [ref=e51]: Bedroom
          - generic [ref=e52]: "3"
        - button "Kitchen 3" [ref=e53] [cursor=pointer]:
          - generic [ref=e54]: Kitchen
          - generic [ref=e55]: "3"
        - button "Bathroom 2" [ref=e56] [cursor=pointer]:
          - generic [ref=e57]: Bathroom
          - generic [ref=e58]: "2"
        - button "Dining 2" [ref=e59] [cursor=pointer]:
          - generic [ref=e60]: Dining
          - generic [ref=e61]: "2"
        - button "Office 3" [ref=e62] [cursor=pointer]:
          - generic [ref=e63]: Office
          - generic [ref=e64]: "3"
        - button "Doors 2" [ref=e65] [cursor=pointer]:
          - generic [ref=e66]: Doors
          - generic [ref=e67]: "2"
        - button "Windows 1" [ref=e68] [cursor=pointer]:
          - generic [ref=e69]: Windows
          - generic [ref=e70]: "1"
        - button "Outdoor 2" [ref=e71] [cursor=pointer]:
          - generic [ref=e72]: Outdoor
          - generic [ref=e73]: "2"
      - generic [ref=e74]:
        - button "3-Seater Sofa 210×90×85" [ref=e75] [cursor=pointer]:
          - generic "3-Seater Sofa — 210×90×85 cm" [ref=e77]: 3-Seater Sofa
          - generic [ref=e78]: 210×90×85
        - button "Armchair 85×80×80" [ref=e79] [cursor=pointer]:
          - generic "Armchair — 85×80×80 cm" [ref=e81]: Armchair
          - generic [ref=e82]: 85×80×80
        - button "Coffee Table 110×60×45" [ref=e83] [cursor=pointer]:
          - generic "Coffee Table — 110×60×45 cm" [ref=e85]: Coffee Table
          - generic [ref=e86]: 110×60×45
        - button "TV Stand 180×45×50" [ref=e87] [cursor=pointer]:
          - generic "TV Stand — 180×45×50 cm" [ref=e89]: TV Stand
          - generic [ref=e90]: 180×45×50
        - button "Double Bed 160×200×60" [ref=e91] [cursor=pointer]:
          - generic "Double Bed — 160×200×60 cm" [ref=e93]: Double Bed
          - generic [ref=e94]: 160×200×60
        - button "Wardrobe 120×60×200" [ref=e95] [cursor=pointer]:
          - generic "Wardrobe — 120×60×200 cm" [ref=e97]: Wardrobe
          - generic [ref=e98]: 120×60×200
        - button "Bedside Table 50×40×55" [ref=e99] [cursor=pointer]:
          - generic "Bedside Table — 50×40×55 cm" [ref=e101]: Bedside Table
          - generic [ref=e102]: 50×40×55
        - button "Kitchen Counter 200×60×90" [ref=e103] [cursor=pointer]:
          - generic "Kitchen Counter — 200×60×90 cm" [ref=e105]: Kitchen Counter
          - generic [ref=e106]: 200×60×90
        - button "Kitchen Sink 90×60×90" [ref=e107] [cursor=pointer]:
          - generic "Kitchen Sink — 90×60×90 cm" [ref=e109]: Kitchen Sink
          - generic [ref=e110]: 90×60×90
        - button "Refrigerator 70×70×180" [ref=e111] [cursor=pointer]:
          - generic "Refrigerator — 70×70×180 cm" [ref=e113]: Refrigerator
          - generic [ref=e114]: 70×70×180
        - button "Toilet 45×65×75" [ref=e115] [cursor=pointer]:
          - generic "Toilet — 45×65×75 cm" [ref=e117]: Toilet
          - generic [ref=e118]: 45×65×75
        - button "Shower Cabinet 90×90×200" [ref=e119] [cursor=pointer]:
          - generic "Shower Cabinet — 90×90×200 cm" [ref=e121]: Shower Cabinet
          - generic [ref=e122]: 90×90×200
        - button "Dining Table 160×90×75" [ref=e123] [cursor=pointer]:
          - generic "Dining Table — 160×90×75 cm" [ref=e125]: Dining Table
          - generic [ref=e126]: 160×90×75
        - button "Dining Chair 45×45×90" [ref=e127] [cursor=pointer]:
          - generic "Dining Chair — 45×45×90 cm" [ref=e129]: Dining Chair
          - generic [ref=e130]: 45×45×90
        - button "Office Desk 140×70×75" [ref=e131] [cursor=pointer]:
          - generic "Office Desk — 140×70×75 cm" [ref=e133]: Office Desk
          - generic [ref=e134]: 140×70×75
        - button "Office Chair 60×60×110" [ref=e135] [cursor=pointer]:
          - generic "Office Chair — 60×60×110 cm" [ref=e137]: Office Chair
          - generic [ref=e138]: 60×60×110
        - button "Bookshelf 80×30×180" [ref=e139] [cursor=pointer]:
          - generic "Bookshelf — 80×30×180 cm" [ref=e141]: Bookshelf
          - generic [ref=e142]: 80×30×180
        - button "Front Door 100×7×210" [ref=e143] [cursor=pointer]:
          - generic "Front Door — 100×7×210 cm" [ref=e145]: Front Door
          - generic [ref=e146]: 100×7×210
        - button "Interior Door 80×7×210" [ref=e147] [cursor=pointer]:
          - generic "Interior Door — 80×7×210 cm" [ref=e149]: Interior Door
          - generic [ref=e150]: 80×7×210
        - button "Window 120cm 120×7×130" [ref=e151] [cursor=pointer]:
          - generic "Window 120cm — 120×7×130 cm" [ref=e153]: Window 120cm
          - generic [ref=e154]: 120×7×130
        - button "Potted Plant 40×40×120" [ref=e155] [cursor=pointer]:
          - generic "Potted Plant — 40×40×120 cm" [ref=e157]: Potted Plant
          - generic [ref=e158]: 40×40×120
        - button "Garden Bench 150×60×45" [ref=e159] [cursor=pointer]:
          - generic "Garden Bench — 150×60×45 cm" [ref=e161]: Garden Bench
          - generic [ref=e162]: 150×60×45
      - generic [ref=e163]: Click a piece to place it
    - generic [ref=e170]: Nothing selected
  - generic [ref=e172]:
    - generic [ref=e173]: "x: 0 y: 0"
    - generic [ref=e174]: selection
    - generic [ref=e175]: "zoom: 100%"
    - generic [ref=e176]: "automation: idle (launch with ?automationPort=<port>)"
```

# Test source

```ts
  5   |  * change to homely/src/view3d/* — it is the executable spec for:
  6   |  *   - OrbitControls drag/zoom redraws without recursion
  7   |  *   - selecting an object recenters the camera target on it (plan or 3D click)
  8   |  * Run: `npm run e2e`  (or `npx playwright test viewport3d-interactions`)
  9   |  */
  10  | 
  11  | test.describe('3D viewport interactions', () => {
  12  |   test.beforeEach(async ({ page }) => {
  13  |     await page.goto('/')
  14  |     await page.waitForSelector('#view3d canvas', { timeout: 10_000 })
  15  |     await page.waitForFunction(() => (window as any).__view3d?.controls, null, { timeout: 10_000 })
  16  |     await page.waitForFunction(() => (window as any).__model, null, { timeout: 10_000 })
  17  |   })
  18  | 
  19  |   test('orbit drag moves the camera and does not recurse', async ({ page }) => {
  20  |     const errors: string[] = []
  21  |     page.on('pageerror', (e) => errors.push(e.message))
  22  | 
  23  |     const before = await page.evaluate(() => {
  24  |       const c = (window as any).__view3d.camera
  25  |       return { x: c.position.x, y: c.position.y, z: c.position.z }
  26  |     })
  27  | 
  28  |     const box = await page.locator('#view3d canvas').boundingBox()
  29  |     if (!box) throw new Error('no canvas box')
  30  |     const cx = box.x + box.width / 2
  31  |     const cy = box.y + box.height / 2
  32  |     await page.mouse.move(cx, cy)
  33  |     await page.mouse.down()
  34  |     await page.mouse.move(cx + 120, cy + 60, { steps: 10 })
  35  |     await page.mouse.up()
  36  |     await page.waitForTimeout(600)
  37  | 
  38  |     const after = await page.evaluate(() => {
  39  |       const c = (window as any).__view3d.camera
  40  |       return { x: c.position.x, y: c.position.y, z: c.position.z }
  41  |     })
  42  |     const moved =
  43  |       Math.abs(after.x - before.x) + Math.abs(after.y - before.y) + Math.abs(after.z - before.z)
  44  | 
  45  |     expect(moved, 'camera should move on drag').toBeGreaterThan(0.01)
  46  |     expect(errors.some((e) => /recursion/i.test(e)), 'no recursion').toBe(false)
  47  |   })
  48  | 
  49  |   test('selecting furniture recenters the camera target (plan selection)', async ({ page }) => {
  50  |     const result = await page.evaluate(() => {
  51  |       const model = (window as any).__model
  52  |       const item = model.addFurniture({
  53  |         name: 'Test', catalogId: 'x', x: 5000, y: 3000, angleDeg: 0,
  54  |         width: 100, depth: 100, height: 200, elevation: 0, color: null, doorOrWindow: false,
  55  |       })
  56  |       model.setSelection([item.id])
  57  |       return { id: item.id, x: item.x, y: item.y, h: item.height }
  58  |     })
  59  |     await page.waitForTimeout(400)
  60  | 
  61  |     const { target, selection } = await page.evaluate(() => {
  62  |       const v = (window as any).__view3d
  63  |       return {
  64  |         target: { x: v.controls.target.x, y: v.controls.target.y, z: v.controls.target.z },
  65  |         selection: (window as any).__model.store.getHome().selection,
  66  |       }
  67  |     })
  68  |     expect(selection).toContain(result.id)
  69  |     expect(Math.abs(target.x - result.x)).toBeLessThan(1)
  70  |     expect(Math.abs(target.y - result.h / 2)).toBeLessThan(1)
  71  |     expect(Math.abs(target.z - result.y)).toBeLessThan(1)
  72  |   })
  73  | 
  74  |   test('clicking furniture in the 3D view selects and centers it', async ({ page }) => {
  75  |     const errors: string[] = []
  76  |     page.on('pageerror', (e) => errors.push(e.message))
  77  | 
  78  |     const id = await page.evaluate(() => {
  79  |       const model = (window as any).__model
  80  |       const item = model.addFurniture({
  81  |         name: 'Pick', catalogId: 'x', x: 0, y: 0, angleDeg: 0,
  82  |         width: 200, depth: 200, height: 200, elevation: 0, color: null, doorOrWindow: false,
  83  |       })
  84  |       // Aim the viewport at the object's center so a center click raycasts it.
  85  |       const v = (window as any).__view3d
  86  |       v.controls.target.set(0, 100, 0)
  87  |       v.controls.update()
  88  |       return item.id
  89  |     })
  90  |     await page.waitForTimeout(200)
  91  | 
  92  |     const box = await page.locator('#view3d canvas').boundingBox()
  93  |     if (!box) throw new Error('no canvas box')
  94  |     // A small drag would orbit; a near-stationary click selects.
  95  |     await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  96  |     await page.waitForTimeout(400)
  97  | 
  98  |     const { target, selection } = await page.evaluate(() => {
  99  |       const v = (window as any).__view3d
  100 |       return {
  101 |         target: { x: v.controls.target.x, y: v.controls.target.y, z: v.controls.target.z },
  102 |         selection: (window as any).__model.store.getHome().selection,
  103 |       }
  104 |     })
> 105 |     expect(selection, '3D click should select the furniture').toContain(id)
      |                                                               ^ Error: 3D click should select the furniture
  106 |     expect(Math.abs(target.x)).toBeLessThan(1)
  107 |     expect(Math.abs(target.y - 100)).toBeLessThan(1)
  108 |     expect(Math.abs(target.z)).toBeLessThan(1)
  109 |     expect(errors.some((e) => /recursion/i.test(e)), 'no recursion').toBe(false)
  110 |   })
  111 | })
  112 | 
```