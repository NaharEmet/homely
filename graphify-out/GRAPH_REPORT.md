# Graph Report - house_designer  (2026-08-24)

## Corpus Check
- Large corpus: 1835 files · ~1,362,529 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 10278 nodes · 36398 edges · 232 communities (194 shown, 38 thin omitted)
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 7643 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 216
- Community 217
- Community 218
- Community 219
- Community 220
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227

## God Nodes (most connected - your core abstractions)
1. `UserPreferences` - 778 edges
2. `Home` - 622 edges
3. `PlanController` - 508 edges
4. `HomePieceOfFurniture` - 423 edges
5. `Selectable` - 278 edges
6. `HomeController` - 274 edges
7. `ChunkID` - 222 edges
8. `Level` - 208 edges
9. `Wall` - 207 edges
10. `PlanComponent` - 207 edges

## Surprising Connections (you probably didn't know these)
- `getAbsObjectIndexColor()` --calls--> `color_t()`  [EXTRACTED]
  sweethome3d-7.5-wayland-patch/include/yafaray/core_api/object3d.h → sweethome3d-7.5-wayland-patch/include/yafaray/core_api/color.h
- `getAutoObjectIndexColor()` --references--> `color_t()`  [EXTRACTED]
  sweethome3d-7.5-wayland-patch/include/yafaray/core_api/object3d.h → sweethome3d-7.5-wayland-patch/include/yafaray/core_api/color.h
- `getAutoObjectIndexNumber()` --references--> `color_t()`  [EXTRACTED]
  sweethome3d-7.5-wayland-patch/include/yafaray/core_api/object3d.h → sweethome3d-7.5-wayland-patch/include/yafaray/core_api/color.h
- `color_t::linearRGB_from_sRGB()` --calls--> `fPow()`  [INFERRED]
  sweethome3d-7.5-wayland-patch/include/yafaray/core_api/color.h → sweethome3d-7.5-wayland-patch/include/yafaray/utilities/mathOptimizations.h
- `color_t::sRGB_from_linearRGB()` --calls--> `fPow()`  [INFERRED]
  sweethome3d-7.5-wayland-patch/include/yafaray/core_api/color.h → sweethome3d-7.5-wayland-patch/include/yafaray/utilities/mathOptimizations.h

## Import Cycles
- None detected.

## Communities (232 total, 38 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (218): ChunkID, AMBIENT_LIGHT, AMBIENT_NODE_TAG, BIT_MAP, BOUNDING_BOX, CAM_RANGES, CAM_SEE_CONE, CAMERA_NODE_TAG (+210 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (51): java.awt.event.AdjustmentListener, javax.swing.event.TreeSelectionListener, javax.swing.JEditorPane, javax.swing.JList, javax.swing.JToolTip, javax.swing.JTree, javax.swing.text.AttributeSet, javax.swing.text.Element (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (33): BasicStroke, java.awt.Color, java.awt.geom.Point2D, java.awt.geom.Rectangle2D, java.awt.Graphics2D, java.awt.Paint, java.awt.Shape, java.awt.Stroke (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (75): abbot.tester.JComponentTester, java.awt.CardLayout, java.awt.event.InputEvent, java.awt.Insets, java.text.SimpleDateFormat, java.util.TimeZone, javax.swing.AbstractAction, javax.swing.AbstractListModel (+67 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (56): com.sun.j3d.exp.swing.JCanvas3D, java.awt.AlphaComposite, java.awt.BasicStroke, java.awt.Composite, java.awt.event.KeyListener, java.awt.event.WindowAdapter, java.awt.geom.AffineTransform, java.awt.geom.Line2D (+48 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (26): compare(), HomePieceOfFurniture, FurnitureAdditionUndoableEdit, FurnitureAlignmentUndoableEdit, FurnitureBackSideAlignmentUndoableEdit, FurnitureBottomAlignmentUndoableEdit, FurnitureController, FurnitureDeletionUndoableEdit (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.01
Nodes (159): ActionType, ABOUT, ADD_FURNITURE_TO_GROUP, ADD_HOME_FURNITURE, ADD_LEVEL, ADD_LEVEL_AT_SAME_ELEVATION, ADD_ROOM_POINT, ALIGN_FURNITURE_ON_BACK_SIDE (+151 more)

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (21): AppletContentManager, ClassLoader, PropertyChangeSupport, UserPreferences, Icon, SwingViewFactory, PropertyChangeSupport, DialogView (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (35): AdjustmentListener, AWTEventListener, Insets, JPanel, JTextArea, CardLayout, JButton, Override (+27 more)

### Community 9 - "Community 9"
Cohesion: 0.03
Nodes (8): CameraElevationState, CameraPitchRotationState, CameraYawRotationState, CompassResizeState, ControllerState, ControllerStateDecorator, LightPowerModificationState, RoomNameOffsetState

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (7): ItemsDeletionEndUndoableEdit, PlanController, Property, BASE_PLAN_MODIFICATION_STATE, MODE, MODIFICATION_STATE, SCALE

### Community 11 - "Community 11"
Cohesion: 0.03
Nodes (22): JLabel, JTabbedPane, ViewerHelper, DamagedHomeIOException, PhotoObject3DFactory, Home, WeakReference, JFormattedTextField (+14 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (12): DroppingEndUndoableEdit, FurnitureCatalogChangeListener, HomeController, Type, UserPreferencesChangeListener, ExceptionHandler, ControllerTest, Override (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.03
Nodes (12): SpinnerNumberModel, ClassLoader, DefaultListCellRenderer, JButton, JCheckBox, JComboBox, JLabel, JRadioButton (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (12): JoinedWall, Override, Wall, AbstractWallState, WallArcExtentModificationUndoableEdit, WallDrawingState, WallResizingUndoableEdit, ModifiedWall (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.03
Nodes (48): DefaultTableColumnModel, java.awt.event.AWTEventListener, java.awt.event.FocusListener, java.awt.Font, java.awt.FontMetrics, java.awt.Graphics, java.awt.print.PageFormat, java.awt.print.Printable (+40 more)

### Community 16 - "Community 16"
Cohesion: 0.04
Nodes (19): ActionMap, javax.swing.Action, javax.swing.JMenu, javax.swing.JMenuBar, javax.swing.JScrollPane, JCheckBoxMenuItem, ActionType, ACTIVATE_ALIGNMENT (+11 more)

### Community 17 - "Community 17"
Cohesion: 0.03
Nodes (21): javax.swing.undo.AbstractUndoableEdit, SuppressWarnings, LocalizedUndoableEdit, CompassResizingUndoableEdit, CompassRotationUndoableEdit, FlippingUndoableEdit, ItemsMovingUndoableEdit, JoinedWall (+13 more)

### Community 18 - "Community 18"
Cohesion: 0.05
Nodes (11): Override, Transform3D, Override, Label, Override, Room, ItemsDeletionUndoableEdit, RoomAreaOffsetModificationUndoableEdit (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (13): DimensionLineHeightState, DimensionLinePitchRotationState, Override, LabelRotationState, PieceOfFurnitureNameRotationState, PieceOfFurnitureResizeState, PolylineResizeState, RoomAreaRotationState (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.05
Nodes (15): SuppressWarnings, Selectable, OBJExporter, DimensionLineCreationUndoableEdit, DimensionLinesModificationUndoableEdit, Override, LevelModificationUndoableEdit, DimensionLinesCreationUndoableEdit (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.06
Nodes (14): DimensionLine3D, Override, PropertyChangeListener, Transform3D, DimensionLine, Override, ModifiedDimensionLine, DimensionLineDrawingState (+6 more)

### Community 22 - "Community 22"
Cohesion: 0.03
Nodes (20): AbstractModeChangeState, CompassRotationState, DimensionLineCreationState, DimensionLineElevationState, DimensionLineOffsetState, DragAndDropState, PropertyChangeSupport, LabelCreationState (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.04
Nodes (40): java.awt.event.ActionEvent, java.beans.PropertyChangeEvent, java.beans.PropertyChangeListener, java.beans.PropertyChangeSupport, java.lang.ref.WeakReference, javax.swing.event.SwingPropertyChangeSupport, ControllerAction, Override (+32 more)

### Community 24 - "Community 24"
Cohesion: 0.04
Nodes (29): com.sun.j3d.utils.universe.SimpleUniverse, java.awt.event.ComponentListener, java.awt.event.MouseEvent, java.awt.event.MouseListener, java.awt.event.MouseMotionListener, javax.media.j3d.Group, javax.media.j3d.Light, javax.vecmath.Point2d (+21 more)

### Community 25 - "Community 25"
Cohesion: 0.04
Nodes (22): java.text.Collator, CatalogTexture, Override, TexturesCatalog, Override, TexturesCategory, Override, WeakReference (+14 more)

### Community 26 - "Community 26"
Cohesion: 0.07
Nodes (5): Vector3f, HomeDoorOrWindow, Override, PlanComponentWithFurnitureTest, JComponentTester

### Community 27 - "Community 27"
Cohesion: 0.06
Nodes (16): JButton, JComboBox, JEditorPane, JLabel, JRadioButton, WallPanel, PropertyChangeListener, WallController (+8 more)

### Community 28 - "Community 28"
Cohesion: 0.04
Nodes (32): JCheckBox, JLabel, JRadioButton, Area, GeneralPath, Override, PropertyChangeListener, ModifiedRoom (+24 more)

### Community 29 - "Community 29"
Cohesion: 0.05
Nodes (37): java.awt.Cursor, java.awt.Frame, java.util.EventListener, java.util.Timer, javax.jnlp.BasicService, javax.jnlp.ServiceManagerStub, javax.swing.border.Border, javax.swing.filechooser.FileFilter (+29 more)

### Community 30 - "Community 30"
Cohesion: 0.04
Nodes (28): MouseInputAdapter, JLabel, Override, OriginImagePreviewComponent, ScaleImagePreviewComponent, Dimension, Override, Point (+20 more)

### Community 31 - "Community 31"
Cohesion: 0.04
Nodes (20): java.awt.Component, java.awt.Container, java.awt.Dimension, java.awt.Image, java.awt.LayoutManager2, javax.swing.Icon, Content, DamagedHomeRecorderException (+12 more)

### Community 32 - "Community 32"
Cohesion: 0.04
Nodes (17): SunflowAPI, AbstractPhotoRenderer, Override, Transform3D, Quality, HIGH, LOW, TransparentTextureKey (+9 more)

### Community 33 - "Community 33"
Cohesion: 0.05
Nodes (16): com.apple.eawt.ApplicationAdapter, com.apple.eawt.ApplicationEvent, javax.jnlp.SingleInstanceListener, javax.jnlp.SingleInstanceService, SingleInstanceListener, JFrame, Override, MacOSXApplicationListener (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.06
Nodes (8): ObjectOutputStream, DrawingMode, FILL, FILL_AND_OUTLINE, OUTLINE, HomeEnvironment, Override, Override

### Community 36 - "Community 36"
Cohesion: 0.07
Nodes (13): javax.media.j3d.TransformInterpolator, Camera, Lens, FISHEYE, NORMAL, PINHOLE, SPHERICAL, CameraInterpolator (+5 more)

### Community 37 - "Community 37"
Cohesion: 0.05
Nodes (28): com.sun.j3d.loaders.Loader, com.sun.j3d.loaders.LoaderBase, com.sun.j3d.loaders.Scene, com.sun.j3d.loaders.SceneBase, java.io.StreamTokenizer, java.net.URL, javax.media.j3d.Appearance, javax.media.j3d.TransformGroup (+20 more)

### Community 38 - "Community 38"
Cohesion: 0.04
Nodes (16): javax.swing.undo.UndoableEditSupport, HomeFrameController, HomePluginController, ClassLoader, Plugin, ClassLoader, SuppressWarnings, PluginLibrary (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.05
Nodes (28): DropTargetAdapter, java.awt.datatransfer.DataFlavor, java.awt.datatransfer.Transferable, java.awt.dnd.DragGestureEvent, java.awt.dnd.DragGestureListener, java.awt.dnd.DragGestureRecognizer, java.awt.dnd.DragSourceDragEvent, java.awt.dnd.DragSourceDropEvent (+20 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (17): javax.vecmath.Color3f, javax.vecmath.Vector3f, Chunk3DS, ChunksInputStream, Face3DS, Appearance, Color3f, Override (+9 more)

### Community 41 - "Community 41"
Cohesion: 0.05
Nodes (4): HomeFurnitureGroup, Override, WeakReference, LocationAndSizeChangeListener

### Community 42 - "Community 42"
Cohesion: 0.06
Nodes (8): JCheckBox, Override, FurnitureShininess, DEFAULT, MATT, SHINY, HomeFurnitureController, PropertyChangeListener

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (27): HomePrint, PaperOrientation, LANDSCAPE, PORTRAIT, REVERSE_LANDSCAPE, HomePrintableComponent, Dimension, Override (+19 more)

### Community 45 - "Community 45"
Cohesion: 0.05
Nodes (24): HighlightPainter, ActionType, CLOSE, SEARCH, SHOW_NEXT, SHOW_PREVIOUS, HelpPane, JEditorPane (+16 more)

### Community 46 - "Community 46"
Cohesion: 0.07
Nodes (15): javax.media.j3d.BoundingBox, javax.media.j3d.Shape3D, javax.media.j3d.SharedGroup, Appearance, Area, BoundingBox, GeneralPath, Point3d (+7 more)

### Community 47 - "Community 47"
Cohesion: 0.06
Nodes (17): JButton, JLabel, JTable, Override, PropertyChangeSupport, LevelController, LevelModificationUndoableEdit, ModifiedLevel (+9 more)

### Community 48 - "Community 48"
Cohesion: 0.06
Nodes (19): javax.media.j3d.GeometryArray, javax.media.j3d.IndexedGeometryArray, javax.media.j3d.NodeComponent, javax.media.j3d.Transform3D, javax.vecmath.Point3f, javax.vecmath.TexCoord2f, javax.vecmath.Vector4f, Point3f (+11 more)

### Community 49 - "Community 49"
Cohesion: 0.05
Nodes (25): org.sunflow.core.Instance, org.sunflow.core.light.SphereLight, org.sunflow.core.light.TriangleMeshLight, BufferedImage, Color3f, Override, Point3f, Transform3D (+17 more)

### Community 50 - "Community 50"
Cohesion: 0.05
Nodes (30): AspectRatio, FREE_RATIO, RATIO_16_9, RATIO_24_10, RATIO_2_1, RATIO_3_2, RATIO_4_3, SQUARE_RATIO (+22 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (16): javax.media.j3d.Bounds, javax.media.j3d.Node, Shape3D, DefaultMaterialAndTexture, HomePieceOfFurniture3D, Appearance, BoundingBox, Material (+8 more)

### Community 52 - "Community 52"
Cohesion: 0.04
Nodes (34): Plane, color_t, light_t, ray_t, bound_t::cross(), bound_t::include(), point3d_t, ray_t (+26 more)

### Community 53 - "Community 53"
Cohesion: 0.06
Nodes (9): javax.swing.JMenuItem, JMenuItem, JSplitPane, PropertyChangeListener, StandaloneBasicService, JPopupMenu, Point, JPopupMenu (+1 more)

### Community 54 - "Community 54"
Cohesion: 0.06
Nodes (16): JLabel, JRadioButton, Override, LabelController, LabelCreationUndoableEdit, LabelModificationUndoableEdit, ModifiedLabel, Property (+8 more)

### Community 55 - "Community 55"
Cohesion: 0.05
Nodes (22): Object3DBranchFactory, ActionType, CLOSE, SAVE_PHOTO, START_PHOTO_CREATION, STOP_PHOTO_CREATION, BufferedImage, JButton (+14 more)

### Community 56 - "Community 56"
Cohesion: 0.08
Nodes (22): JLabel, JRadioButton, DimensionLineController, DimensionLineOrientation, DIAGONAL, ELEVATION, PLAN, Property (+14 more)

### Community 57 - "Community 57"
Cohesion: 0.04
Nodes (21): Override, Override, PropertyChangeListener, PropertyChangeSupport, Override, CamerasListModel, BufferedImage, JButton (+13 more)

### Community 58 - "Community 58"
Cohesion: 0.07
Nodes (10): RotationPreviewComponent, Appearance, BranchGroup, BufferedImage, JPanel, SimpleUniverse, Transform3D, TransformGroup (+2 more)

### Community 59 - "Community 59"
Cohesion: 0.06
Nodes (43): BSDF_t, color_t(), emit(), getAbsMaterialIndexColor(), getAlpha(), getAutoMaterialIndexColor(), getAutoMaterialIndexNumber(), getDiffuseColor() (+35 more)

### Community 60 - "Community 60"
Cohesion: 0.09
Nodes (5): java.util.prefs.Preferences, FileUserPreferences, ClassLoader, PreferencesURLContent, MacOSXFileManager

### Community 61 - "Community 61"
Cohesion: 0.04
Nodes (55): fromPrefix(), PropertyKey, CATEGORY, CREATION_DATE, CREATOR, CURRENCY, DEFORMABLE, DEPTH (+47 more)

### Community 62 - "Community 62"
Cohesion: 0.06
Nodes (19): BackgroundImageWizardTest, ActionType, JComponentTester, HomeCameraTest, ActionType, JComponentTester, JFrame, IconManagerTest (+11 more)

### Community 63 - "Community 63"
Cohesion: 0.10
Nodes (6): java.io.FilterWriter, HomeXMLExporter, Override, PieceOfFurnitureExporter, ObjectXMLExporter, XMLWriter

### Community 65 - "Community 65"
Cohesion: 0.04
Nodes (24): generic2DBuffer_t, data, height, width, genericScanlineBuffer_t, data, height, width (+16 more)

### Community 66 - "Community 66"
Cohesion: 0.09
Nodes (4): AbstractPolylineState, PolylineDrawingState, PolylineResizingUndoableEdit, RoomAreaOffsetState

### Community 67 - "Community 67"
Cohesion: 0.05
Nodes (32): LIGHTF_t, background_t, light_t, background, diracLight, emitPhoton, flags, illuminate (+24 more)

### Community 68 - "Community 68"
Cohesion: 0.07
Nodes (3): IconPreviewComponent, Transform3D, ImportedFurnitureWizardController

### Community 69 - "Community 69"
Cohesion: 0.07
Nodes (17): JLabel, JRadioButton, BaseboardChoiceController, BaseboardPaint, COLORED, DEFAULT, TEXTURED, PropertyChangeListener (+9 more)

### Community 70 - "Community 70"
Cohesion: 0.06
Nodes (16): HomeMaterial, Override, Override, Transformation, Icon, Override, MaterialsListModel, FurnitureHorizontalAxis (+8 more)

### Community 71 - "Community 71"
Cohesion: 0.06
Nodes (6): GraphicsConfigTemplate3D, CameraControllerState, HomeController3D, PointerType, MOUSE, TOUCH

### Community 72 - "Community 72"
Cohesion: 0.06
Nodes (27): getData(), T, resize(), size(), tiledArray2D_t(), tiledBitArray2D_t, blockMask, blockSize (+19 more)

### Community 73 - "Community 73"
Cohesion: 0.08
Nodes (20): JCheckBox, JLabel, JRadioButton, JSlider, EnvironmentPaint, COLORED, TEXTURED, Home3DAttributesController (+12 more)

### Community 74 - "Community 74"
Cohesion: 0.11
Nodes (6): AbstractRoomState, PointMagnetizedToClosestWallOrRoomPoint, PointWithAngleMagnetism, RoomDrawingState, RoomPointWithAngleMagnetism, WallPointWithAngleMagnetism

### Community 75 - "Community 75"
Cohesion: 0.07
Nodes (8): Icon, PatternsCatalog, TextureImage, BufferedImage, Property, TEXTURE, TextureChoiceController, TextureChoiceView

### Community 76 - "Community 76"
Cohesion: 0.20
Nodes (45): JavaVM, jboolean, jbyteArray, jfloat, jfloatArray, jint, jintArray, jlong (+37 more)

### Community 77 - "Community 77"
Cohesion: 0.09
Nodes (11): colorA_t(), gray8_t, value, rgb565_t, rgb565, rgba1010108_t, a, b (+3 more)

### Community 78 - "Community 78"
Cohesion: 0.09
Nodes (5): Override, JLabel, HomePieceOfFurnitureTopViewIconKey, PieceOfFurniturePlanIcon, PieceOfFurnitureTopViewIcon

### Community 79 - "Community 79"
Cohesion: 0.06
Nodes (10): JComboBox, JLabel, JList, JRadioButton, JSlider, PropertyChangeListener, ModelMaterialsController, Property (+2 more)

### Community 80 - "Community 80"
Cohesion: 0.08
Nodes (15): JCheckBox, JLabel, ObserverCameraController, Property, ELEVATION, FIELD_OF_VIEW, FIELD_OF_VIEW_IN_DEGREES, MINIMUM_ELEVATION (+7 more)

### Community 81 - "Community 81"
Cohesion: 0.05
Nodes (9): HomeView, OpenDamagedHomeAnswer, DO_NOT_OPEN_HOME, REMOVE_DAMAGED_ITEMS, REPLACE_DAMAGED_ITEMS, SaveAnswer, CANCEL, DO_NOT_SAVE (+1 more)

### Community 82 - "Community 82"
Cohesion: 0.07
Nodes (18): ContentDescriptor, javax.media.Buffer, javax.media.Controller, javax.media.Format, javax.media.format.VideoFormat, javax.media.MediaLocator, javax.media.Processor, javax.media.protocol.ContentDescriptor (+10 more)

### Community 83 - "Community 83"
Cohesion: 0.07
Nodes (25): DefaultTreeCellRenderer, JFileChooser, JList, Override, JTree, PropertyChangeListener, TreeSelectionListener, JEditorPane (+17 more)

### Community 84 - "Community 84"
Cohesion: 0.11
Nodes (8): Alignment, CENTER, LEFT, RIGHT, Override, WeakReference, TextStyle, TextStyleModificationUndoableEdit

### Community 85 - "Community 85"
Cohesion: 0.05
Nodes (11): EditableProperty, ANGLE, ARC_EXTENT, DIAGONAL, LENGTH, OFFSET, THICKNESS, X (+3 more)

### Community 87 - "Community 87"
Cohesion: 0.08
Nodes (9): Override, TextureAttributes, TextureKey, Baseboard, Override, WeakReference, HomeTexture, Override (+1 more)

### Community 88 - "Community 88"
Cohesion: 0.05
Nodes (43): Property, ANGLE, BACK_FACE_SHOWN, CATALOG_ID, COLOR, CREATOR, CURRENCY, DEPTH (+35 more)

### Community 89 - "Community 89"
Cohesion: 0.06
Nodes (20): Override, ObjectProperty, Type, ANY, BOOLEAN, CONTENT, DATE, INTEGER (+12 more)

### Community 90 - "Community 90"
Cohesion: 0.08
Nodes (11): FurnitureAttributesStepState, FurnitureIconStepState, FurnitureModelStepState, FurnitureOrientationStepState, ImportedFurnitureWizardStepState, Override, Step, ATTRIBUTES (+3 more)

### Community 91 - "Community 91"
Cohesion: 0.09
Nodes (30): point3d_t, ~matrix4x4_t(), operator [](), createCS(), mult(), normal_t, operator *(), ourRandom() (+22 more)

### Community 92 - "Community 92"
Cohesion: 0.10
Nodes (8): FileOutputStream, java.io.FilterInputStream, CopiedInputStream, DefaultHomeInputStream, HomeObjectInputStream, Override, ZipOutputStream, HomeContentContext

### Community 93 - "Community 93"
Cohesion: 0.11
Nodes (7): javax.media.j3d.Geometry, DoorOrWindowArea, Appearance, Area, Override, ModelRotationTuple, Wall3D

### Community 94 - "Community 94"
Cohesion: 0.12
Nodes (6): Override, BackgroundImage, BackgroundImageUndoableEdit, BackgroundImageDeletionUndoableEdit, BackgroundImageVisibilityTogglingUndoableEdit, Override

### Community 95 - "Community 95"
Cohesion: 0.09
Nodes (15): JCheckBox, JComboBox, JComponent, JLabel, CompassController, PropertyChangeSupport, Property, DIAMETER (+7 more)

### Community 96 - "Community 96"
Cohesion: 0.07
Nodes (12): JCheckBox, JComboBox, JLabel, JSlider, AbstractPhotoController, Property, ASPECT_RATIO, CEILING_LIGHT_COLOR (+4 more)

### Community 97 - "Community 97"
Cohesion: 0.09
Nodes (15): javax.swing.colorchooser.AbstractColorChooserPanel, javax.swing.colorchooser.ColorSelectionModel, JButton, JColorChooser, ColorChart, ColorCode, GrayColorChart, Dimension (+7 more)

### Community 98 - "Community 98"
Cohesion: 0.08
Nodes (10): junit.framework.TestCase, DefaultUserPreferences, Override, JLabel, JProgressBar, ThreadedTaskPanel, ThreadedTaskController, ThreadedTaskView (+2 more)

### Community 99 - "Community 99"
Cohesion: 0.08
Nodes (5): HomeAppletController, Override, Type, AutoRecoveryManager, Timer

### Community 100 - "Community 100"
Cohesion: 0.10
Nodes (5): getMagnetizedMeterLength(), Override, CENTIMETER, METER, MILLIMETER

### Community 101 - "Community 101"
Cohesion: 0.08
Nodes (3): PropertyChangeSupport, WizardController, WizardControllerStepState

### Community 102 - "Community 102"
Cohesion: 0.06
Nodes (35): objID_t, background_t, camera_t, color_t, diffRay_t, __BEGIN_YAFRAY, imageFilm_t, kdTree_t (+27 more)

### Community 103 - "Community 103"
Cohesion: 0.08
Nodes (3): SimpleDateFormat, Update, UpdatesHandler

### Community 105 - "Community 105"
Cohesion: 0.05
Nodes (37): Property, AERIAL_VIEW_CENTERED_ON_SELECTION_ENABLED, AUTO_COMPLETION_STRINGS, AUTO_SAVE_DELAY_FOR_RECOVERY, CHECK_UPDATES_ENABLED, CURRENCY, DEFAULT_FONT_NAME, DEFAULT_VALUE_ADDED_TAX_PERCENTAGE (+29 more)

### Community 106 - "Community 106"
Cohesion: 0.12
Nodes (8): Override, ObserverCamera, Property, DEPTH, HEIGHT, WIDTH, Override, ObserverCameraState

### Community 107 - "Community 107"
Cohesion: 0.11
Nodes (8): Override, SpinnerModuloNumberModel, Override, NullableSpinner, NullableSpinnerDateModel, NullableSpinnerLengthModel, NullableSpinnerModuloNumberModel, NullableSpinnerNumberModel

### Community 108 - "Community 108"
Cohesion: 0.12
Nodes (5): Area, Override, Room3D, Override, LevelsTableModel

### Community 109 - "Community 109"
Cohesion: 0.11
Nodes (4): FurnitureTreeTableModel, ListSelectionListener, TreePath, TreeModelEvent

### Community 110 - "Community 110"
Cohesion: 0.12
Nodes (4): java.awt.geom.GeneralPath, GeneralPath, Area, GeneralPath

### Community 111 - "Community 111"
Cohesion: 0.06
Nodes (24): colorOutput_t, colorPasses_t, renderEnvironment_t, renderPasses_t, __BEGIN_YAFRAY, imageSpliter_t, blocksize, getArea (+16 more)

### Community 113 - "Community 113"
Cohesion: 0.06
Nodes (31): Property, ADDITIONAL_PROPERTIES, ANGLE, ANGLE_IN_DEGREES, BASE_PLAN_ITEM, COLOR, DEFORMABLE, DEPTH (+23 more)

### Community 114 - "Community 114"
Cohesion: 0.07
Nodes (10): com.eteks.parser.Interpreter, com.eteks.parser.Syntax, java.text.FieldPosition, java.text.ParsePosition, centimeterToFoot(), footToCentimeter(), ParsePosition, skipWhiteSpaces() (+2 more)

### Community 115 - "Community 115"
Cohesion: 0.07
Nodes (24): SortableProperty, ANGLE, CATALOG_ID, COLOR, CREATOR, DEPTH, DESCRIPTION, DOOR_OR_WINDOW (+16 more)

### Community 116 - "Community 116"
Cohesion: 0.10
Nodes (12): ClassLoader, PluginAction, Property, ENABLED, MENU, MNEMONIC, NAME, SHORT_DESCRIPTION (+4 more)

### Community 117 - "Community 117"
Cohesion: 0.15
Nodes (11): java.awt.GraphicsConfigTemplate, java.awt.GraphicsConfiguration, javax.media.j3d.Canvas3D, Component3DManager, BufferedImage, Canvas3D, GraphicsConfigTemplate3D, Override (+3 more)

### Community 118 - "Community 118"
Cohesion: 0.19
Nodes (4): java.util.ResourceBundle, DefaultFurnitureCatalog, ResourceBundle, ResourceBundleTools

### Community 119 - "Community 119"
Cohesion: 0.13
Nodes (7): javax.media.j3d.Texture, ComparableTexture, ComparableTextureAngleTuple, Override, WeakReference, RotatedContentKey, TextureManager

### Community 121 - "Community 121"
Cohesion: 0.17
Nodes (3): Compass, Override, CompassUndoableEdit

### Community 122 - "Community 122"
Cohesion: 0.19
Nodes (7): DefaultTableCellRenderer, javax.swing.table.DefaultTableColumnModel, javax.swing.table.TableCellRenderer, javax.swing.table.TableColumn, FurnitureTableColumnModel, ImageIcon, TableColumn

### Community 123 - "Community 123"
Cohesion: 0.17
Nodes (6): java.awt.geom.Area, Ground3D, Area, LevelAreas, Area, TextureObserver

### Community 124 - "Community 124"
Cohesion: 0.09
Nodes (16): light_t, getAbsObjectIndexColor(), getAutoObjectIndexColor(), getAutoObjectIndexNumber(), getNormObjectIndex(), getNormObjectIndexColor(), getPrimitives(), object3d_t() (+8 more)

### Community 126 - "Community 126"
Cohesion: 0.15
Nodes (3): FurnitureTableTest, HomeControllerTest, ActionType

### Community 127 - "Community 127"
Cohesion: 0.07
Nodes (28): ActionType, ACTIVATE_ALIGNMENT, ACTIVATE_DUPLICATION, DEACTIVATE_ALIGNMENT, DEACTIVATE_DUPLICATION, ELEVATE_CAMERA_DOWN, ELEVATE_CAMERA_FAST_DOWN, ELEVATE_CAMERA_FAST_UP (+20 more)

### Community 128 - "Community 128"
Cohesion: 0.15
Nodes (4): java.security.MessageDigest, ContentDigestManager, ZipEntryData, HomeURLContent

### Community 130 - "Community 130"
Cohesion: 0.09
Nodes (16): colorSpaces_t, color_t::ColorSpace_from_linearRGB(), color_t::expgam_Adjust(), color_t::linearRGB_from_ColorSpace(), color_t::linearRGB_from_sRGB(), color_t::sRGB_from_linearRGB(), colorA_t::colorDifference(), maxAbsDiff() (+8 more)

### Community 131 - "Community 131"
Cohesion: 0.13
Nodes (3): HomeObject, Override, PropertyChangeSupport

### Community 132 - "Community 132"
Cohesion: 0.14
Nodes (7): FurnitureTransferHandler, Override, Transferable, Override, Transferable, PlanTransferHandler, TransferObserver

### Community 133 - "Community 133"
Cohesion: 0.08
Nodes (25): Property, AERIAL_VIEW_CENTERED_ON_SELECTION_ENABLED, AUTO_SAVE_DELAY_FOR_RECOVERY, AUTO_SAVE_FOR_RECOVERY_ENABLED, CHECK_UPDATES_ENABLED, CURRENCY, DEFAULT_FONT_NAME, EDITING_IN_3D_VIEW_ENABLED (+17 more)

### Community 135 - "Community 135"
Cohesion: 0.08
Nodes (23): Property, ALL_LEVELS_VISIBLE, BACKGROUND_IMAGE_VISIBLE_ON_GROUND_3D, CEILING_LIGHT_COLOR, DRAWING_MODE, GROUND_COLOR, GROUND_TEXTURE, LIGHT_COLOR (+15 more)

### Community 136 - "Community 136"
Cohesion: 0.11
Nodes (19): CapStyle, BUTT, ROUND, SQUARE, DashStyle, CUSTOMIZED, DASH, DASH_DOT (+11 more)

### Community 137 - "Community 137"
Cohesion: 0.09
Nodes (7): AbstractDecoratedAction, ButtonAction, SwingPropertyChangeSupport, WeakReference, MenuItemAction, PopupMenuItemAction, ToolBarAction

### Community 138 - "Community 138"
Cohesion: 0.13
Nodes (8): ImportedTextureWizardStepState, Override, PropertyChangeListener, Step, ATTRIBUTES, IMAGE, TextureAttributesStepState, TextureImageStepState

### Community 139 - "Community 139"
Cohesion: 0.11
Nodes (12): FileFilter, DefaultTexturesCatalog, ResourceBundle, PropertyKey, CATEGORY, CREATOR, HEIGHT, ID (+4 more)

### Community 140 - "Community 140"
Cohesion: 0.17
Nodes (8): DAEHandler, Appearance, BoundingBox, Material, Override, Transform3D, TransformGroup, PolygonAttributes

### Community 141 - "Community 141"
Cohesion: 0.16
Nodes (3): JComboBox, JLabel, PolylineController

### Community 142 - "Community 142"
Cohesion: 0.08
Nodes (23): Property, ARC_EXTENT_IN_DEGREES, DISTANCE_TO_END_POINT, EDITABLE_POINTS, LEFT_SIDE_COLOR, LEFT_SIDE_PAINT, LEFT_SIDE_SHININESS, LENGTH (+15 more)

### Community 143 - "Community 143"
Cohesion: 0.19
Nodes (9): java.io.FilterOutputStream, java.io.ObjectOutputStream, java.util.zip.ZipOutputStream, DefaultHomeOutputStream, HomeContentObjectsTracker, HomeObjectOutputStream, Override, ZipOutputStream (+1 more)

### Community 144 - "Community 144"
Cohesion: 0.12
Nodes (7): HomeAppletRecorder, Override, LengthOutputStream, ContentRecording, INCLUDE_ALL_CONTENT, INCLUDE_NO_CONTENT, INCLUDE_TEMPORARY_CONTENT

### Community 145 - "Community 145"
Cohesion: 0.21
Nodes (4): javax.swing.JApplet, AppletApplication, AppletFurnitureTable, Override

### Community 146 - "Community 146"
Cohesion: 0.09
Nodes (22): Property, AREA_ANGLE, AREA_STYLE, AREA_VISIBLE, AREA_X_OFFSET, AREA_Y_OFFSET, CEILING_COLOR, CEILING_FLAT (+14 more)

### Community 147 - "Community 147"
Cohesion: 0.09
Nodes (22): Property, ARC_EXTENT, HEIGHT, HEIGHT_AT_END, LEFT_SIDE_BASEBOARD, LEFT_SIDE_COLOR, LEFT_SIDE_SHININESS, LEFT_SIDE_TEXTURE (+14 more)

### Community 148 - "Community 148"
Cohesion: 0.14
Nodes (6): UndoableEditSupport, JButton, JToggleButton, PlanControllerTest, RoomTest, UndoManager

### Community 149 - "Community 149"
Cohesion: 0.09
Nodes (22): Property, BACK_FACE_SHOWN, CATEGORY, COLOR, CREATOR, DEPTH, DOOR_OR_WINDOW, EDGE_COLOR_MATERIAL_HIDDEN (+14 more)

### Community 150 - "Community 150"
Cohesion: 0.16
Nodes (8): AbstractModelPreviewComponent, AttributesPreviewComponent, JButton, JCheckBox, JComboBox, JLabel, JTextField, JToolTip

### Community 151 - "Community 151"
Cohesion: 0.12
Nodes (6): javax.swing.event.TreeModelEvent, javax.swing.event.TreeModelListener, javax.swing.tree.TreePath, CatalogTreeModel, JTree, TreeModelListener

### Community 152 - "Community 152"
Cohesion: 0.10
Nodes (18): dynamicLoadedLibrary_t(), __BEGIN_YAFRAY, background_t, camera_t, colorOutput_t, imageFilm_t, imageHandler_t, integrator_t (+10 more)

### Community 153 - "Community 153"
Cohesion: 0.14
Nodes (3): CatalogDoorOrWindow, Override, DoorOrWindow

### Community 154 - "Community 154"
Cohesion: 0.12
Nodes (3): inchToCentimeter(), MessageFormat, INCH

### Community 155 - "Community 155"
Cohesion: 0.17
Nodes (5): AllLevelsViewabilityModificationUndoableEdit, LevelAdditionUndoableEdit, LevelDeletionUndoableEdit, LevelsViewabilityModificationUndoableEdit, LevelViewabilityModificationUndoableEdit

### Community 157 - "Community 157"
Cohesion: 0.18
Nodes (3): java.util.prefs.AbstractPreferences, Override, PortablePreferences

### Community 158 - "Community 158"
Cohesion: 0.11
Nodes (19): ActionType, ACTIVATE_ALIGNMENT, ACTIVATE_DUPLICATION, ACTIVATE_EDITIION, DEACTIVATE_ALIGNMENT, DEACTIVATE_DUPLICATION, DEACTIVATE_EDITIION, DELETE_SELECTION (+11 more)

### Community 159 - "Community 159"
Cohesion: 0.18
Nodes (5): java.awt.image.ImageObserver, org.sunflow.core.Display, org.sunflow.image.Color, BufferedImageDisplay, BufferedImageOutput

### Community 162 - "Community 162"
Cohesion: 0.20
Nodes (5): ControllerTest, FirstStep, Override, SecondStep, SecondStepView

### Community 163 - "Community 163"
Cohesion: 0.14
Nodes (11): colorOutput_t, jmethodID, renderPasses_t(), vector, imageColor_t, jniEnvironment, jniFlushAreaId, jniFlushId (+3 more)

### Community 164 - "Community 164"
Cohesion: 0.21
Nodes (4): FilterOutputStream, Base64, Override, OutputStream

### Community 165 - "Community 165"
Cohesion: 0.13
Nodes (9): javax.swing.tree.DefaultMutableTreeNode, DisplayedInformation, ICON, ICON_NAME_AUTHOR, ICON_NAME_AUTHOR_CATEGORY, Dimension, JLabel, DirectoryNode (+1 more)

### Community 166 - "Community 166"
Cohesion: 0.12
Nodes (16): Property, ALL_LEVELS_SELECTION, BACKGROUND_IMAGE, BASE_PLAN_LOCKED, CAMERA, FURNITURE_ADDITIONAL_PROPERTIES, FURNITURE_DESCENDING_SORTED, FURNITURE_SORTED_PROPERTY (+8 more)

### Community 169 - "Community 169"
Cohesion: 0.12
Nodes (16): MenuActionType, ALIGN_OR_DISTRIBUTE_MENU, DISPLAY_HOME_FURNITURE_PROPERTY_MENU, EDIT_MENU, FILE_MENU, FURNITURE_MENU, GO_TO_POINT_OF_VIEW, HELP_MENU (+8 more)

### Community 170 - "Community 170"
Cohesion: 0.17
Nodes (4): PropertyChangeSupport, PageSetupController, Property, PRINT

### Community 171 - "Community 171"
Cohesion: 0.14
Nodes (11): diffRay_t, intersectData_t, b0, b1, b2, edge1, edge2, t (+3 more)

### Community 173 - "Community 173"
Cohesion: 0.13
Nodes (15): Property, CAP_STYLE, CLOSED_PATH, COLOR, DASH_OFFSET, DASH_PATTERN, DASH_STYLE, ELEVATION (+7 more)

### Community 175 - "Community 175"
Cohesion: 0.24
Nodes (5): ClassLoader, JarFile, java.security.ProtectionDomain, java.util.jar.JarFile, ExtensionsClassLoader

### Community 176 - "Community 176"
Cohesion: 0.14
Nodes (5): rgb101010_t, b, g, r, rgb_extra

### Community 177 - "Community 177"
Cohesion: 0.14
Nodes (14): Property, COLOR, ELEVATION_END, ELEVATION_START, END_MARK_SIZE, LENGTH_STYLE, LEVEL, OFFSET (+6 more)

### Community 178 - "Community 178"
Cohesion: 0.15
Nodes (3): ExportableView, FormatType, Override

### Community 179 - "Community 179"
Cohesion: 0.14
Nodes (14): ActionType, CLOSE, DELETE_CAMERA_PATH, DELETE_LAST_RECORD, PAUSE, PLAYBACK, RECORD, SAVE_VIDEO (+6 more)

### Community 181 - "Community 181"
Cohesion: 0.15
Nodes (4): rgb888_t, b, g, r

### Community 182 - "Community 182"
Cohesion: 0.22
Nodes (7): ArrowStyle, DELTA, DISC, NONE, OPEN, ArrowsStyle, Override

### Community 183 - "Community 183"
Cohesion: 0.15
Nodes (11): CursorType, DRAW, DUPLICATION, ELEVATION, HEIGHT, MOVE, PANNING, POWER (+3 more)

### Community 184 - "Community 184"
Cohesion: 0.17
Nodes (10): ButtonGroup, JButton, JCheckBox, JLabel, JList, JRadioButton, JTextField, JToolBar (+2 more)

### Community 185 - "Community 185"
Cohesion: 0.23
Nodes (4): javax.swing.text.JTextComponent, javax.swing.text.PlainDocument, AutoCompleteDocument, Override

### Community 186 - "Community 186"
Cohesion: 0.17
Nodes (12): Property, BOUND_TO_WALL, CUT_OUT_SHAPE, SASHES, WALL_CUT_OUT_ON_BOTH_SIDES, WALL_DISTANCE, WALL_HEIGHT, WALL_LEFT (+4 more)

### Community 188 - "Community 188"
Cohesion: 0.17
Nodes (11): Property, CAP_STYLE, COLOR, DASH_OFFSET, DASH_PATTERN, DASH_STYLE, ELEVATION, END_ARROW_STYLE (+3 more)

### Community 189 - "Community 189"
Cohesion: 0.18
Nodes (4): FocusListener, MouseListener, MouseMotionListener, Override

### Community 190 - "Community 190"
Cohesion: 0.25
Nodes (5): java.text.Format, getAreaFormatWithUnit(), getFormat(), getFormatWithUnit(), INCH_FRACTION

### Community 191 - "Community 191"
Cohesion: 0.27
Nodes (3): javax.swing.event.PopupMenuEvent, PopupMenuListenerWithMouseLocation, MenuItemsVisibilityListener

### Community 192 - "Community 192"
Cohesion: 0.36
Nodes (5): javax.swing.text.html.HTML.Tag, javax.swing.text.MutableAttributeSet, ParserCallback, HelpReader, Override

### Community 193 - "Community 193"
Cohesion: 0.22
Nodes (10): class(), diffRay_t, hasDifferentials, xdir, xfrom, ydir, yfrom, __BEGIN_YAFRAY (+2 more)

### Community 194 - "Community 194"
Cohesion: 0.18
Nodes (8): CumulateStep1dDF(), pdf1D_t, cdf, count, func, integral, invCount, invIntegral

### Community 196 - "Community 196"
Cohesion: 0.18
Nodes (11): Property, FIELD_OF_VIEW, LENS, NAME, PITCH, RENDERER, TIME, X (+3 more)

### Community 198 - "Community 198"
Cohesion: 0.18
Nodes (11): Property, ANGLE, COLOR, ELEVATION, LEVEL, OUTLINE_COLOR, PITCH, STYLE (+3 more)

### Community 199 - "Community 199"
Cohesion: 0.24
Nodes (3): java.applet.AppletContext, AppletBasicService, StandaloneServiceManager

### Community 200 - "Community 200"
Cohesion: 0.22
Nodes (3): progressBar_t, string, SilentProgressBar_t

### Community 201 - "Community 201"
Cohesion: 0.22
Nodes (5): Dimension, GraphicsConfigTemplate3D, MouseListener, MouseMotionListener, Override

### Community 202 - "Community 202"
Cohesion: 0.20
Nodes (9): Property, BACK_STEP_ENABLED, FIRST_STEP, LAST_STEP, NEXT_STEP_ENABLED, RESIZABLE, STEP_ICON, STEP_VIEW (+1 more)

### Community 204 - "Community 204"
Cohesion: 0.22
Nodes (9): Property, DIAMETER, LATITUDE, LONGITUDE, NORTH_DIRECTION, TIME_ZONE, VISIBLE, X (+1 more)

### Community 206 - "Community 206"
Cohesion: 0.22
Nodes (9): Property, BACKGROUND_IMAGE, ELEVATION, ELEVATION_INDEX, FLOOR_THICKNESS, HEIGHT, NAME, VIEWABLE (+1 more)

### Community 214 - "Community 214"
Cohesion: 0.33
Nodes (5): FurniturePaint, COLORED, DEFAULT, MODEL_MATERIALS, TEXTURED

### Community 217 - "Community 217"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 218 - "Community 218"
Cohesion: 0.50
Nodes (4): ActionType, CLOSE, START_PHOTOS_CREATION, STOP_PHOTOS_CREATION

## Knowledge Gaps
- **1383 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `light_t`, `color_t`, `ray_t` (+1378 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserPreferences` connect `Community 7` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 33`, `Community 36`, `Community 38`, `Community 39`, `Community 42`, `Community 44`, `Community 45`, `Community 47`, `Community 49`, `Community 50`, `Community 51`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 60`, `Community 62`, `Community 64`, `Community 66`, `Community 68`, `Community 69`, `Community 71`, `Community 73`, `Community 75`, `Community 78`, `Community 79`, `Community 80`, `Community 83`, `Community 84`, `Community 89`, `Community 92`, `Community 93`, `Community 94`, `Community 95`, `Community 96`, `Community 97`, `Community 98`, `Community 99`, `Community 101`, `Community 105`, `Community 107`, `Community 108`, `Community 109`, `Community 118`, `Community 121`, `Community 122`, `Community 126`, `Community 134`, `Community 136`, `Community 137`, `Community 139`, `Community 141`, `Community 144`, `Community 145`, `Community 150`, `Community 155`, `Community 161`, `Community 165`, `Community 167`, `Community 170`, `Community 184`, `Community 203`, `Community 211`, `Community 212`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Why does `Home` connect `Community 11` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 10`, `Community 12`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 42`, `Community 43`, `Community 44`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 62`, `Community 63`, `Community 64`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 73`, `Community 78`, `Community 80`, `Community 81`, `Community 86`, `Community 87`, `Community 89`, `Community 92`, `Community 93`, `Community 94`, `Community 95`, `Community 96`, `Community 99`, `Community 106`, `Community 108`, `Community 109`, `Community 110`, `Community 112`, `Community 115`, `Community 119`, `Community 121`, `Community 122`, `Community 123`, `Community 126`, `Community 131`, `Community 132`, `Community 136`, `Community 141`, `Community 143`, `Community 144`, `Community 148`, `Community 155`, `Community 166`, `Community 170`, `Community 184`, `Community 189`, `Community 197`, `Community 210`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `ChunkID` connect `Community 0` to `Community 40`, `Community 37`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `light_t` to the rest of the system?**
  _1383 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.009174311926605505 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.02047294810452705 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.03605369446424329 - nodes in this community are weakly interconnected._