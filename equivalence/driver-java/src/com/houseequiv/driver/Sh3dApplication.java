package com.houseequiv.driver;

import java.awt.Component;
import java.awt.EventQueue;
import java.awt.Window;

import javax.swing.SwingUtilities;

import com.eteks.sweethome3d.HomeFrameController;
import com.eteks.sweethome3d.SweetHome3D;
import com.eteks.sweethome3d.j3d.Component3DManager;
import com.eteks.sweethome3d.model.Home;

/**
 * Boots the real Sweet Home 3D UI without SweetHome3D.init() (no splash,
 * no single-instance check, no auto-recovery, no JNLP handling).
 *
 * The application never registers homes on itself, so SH3D's own homes
 * listener never fires. Instead we drive exactly one frame: bootOnEdt()
 * creates it via createHomeFrameController(createHome()), and newHomeOnEdt()
 * replaces controller + home in place. A fresh HomeFrameController owns a
 * fresh undo stack, which gives new_home its "reset + clear undo" semantics.
 */
public final class Sh3dApplication extends SweetHome3D {

  private volatile HomeFrameController frameController;
  private volatile Home home;
  private final IdAssigner ids = new IdAssigner();
  /** Deep-copied snapshot of copied/cut items (Java-serialized), like SH3D's own HomeTransferableList. */
  private volatile byte[] clipboardBytes;

  public Sh3dApplication() {
    super();
    attachRenderingErrorLogger();
  }

  public void bootOnEdt() throws Exception {
    EventQueue.invokeAndWait(() -> {
      // Protocol coordinates are cm; force metric so SH3D defaults don't
      // depend on the machine locale (en_US would default to inch units =>
      // 243.84cm = 8ft new-wall height).
      getUserPreferences().setUnit(com.eteks.sweethome3d.model.LengthUnit.CENTIMETER);
      // SH3D metric defaults (docs/architecture-map.md); set explicitly
      // because FileUserPreferences seeds them from locale, not from unit.
      getUserPreferences().setNewWallHeight(250f);
      getUserPreferences().setNewWallThickness(7f);
      ids.reset();
      home = createHome();
      frameController = createHomeFrameController(home);
      frameController.displayView();
    });
  }

  public void newHomeOnEdt() throws Exception {
    EventQueue.invokeAndWait(() -> {
      swapHomeOnEdt(createHome());
    });
  }

  /**
   * Replaces the displayed home with a pre-loaded one (open_home). The home is
   * expected to be read off-EDT (file IO) by the caller.
   */
  public void openHomeOnEdt(Home loaded) throws Exception {
    EventQueue.invokeAndWait(() -> {
      swapHomeOnEdt(loaded);
    });
  }

  private void swapHomeOnEdt(Home newHome) {
    HomeFrameController previous = frameController;
    Window previousWindow = previous == null
        ? null
        : SwingUtilities.getWindowAncestor((Component) previous.getView());
    frameController = createHomeFrameController(newHome);
    frameController.displayView();
    if (previousWindow != null) {
      previousWindow.dispose();
    }
    ids.reset();
    clipboardBytes = null;
    home = newHome;
  }

  /** The home currently displayed (swapped by new_home). */
  public Home home() {
    return home;
  }

  /** Driver-assigned stable ids for model objects, reset with each fresh home. */
  public IdAssigner ids() {
    return ids;
  }

  /**
   * Driver-side clipboard for copy/cut/paste, stored as serialized bytes so
   * paste always operates on DEEP COPIES (never live references to walls
   * still present in the home — that aliasing corrupted undo semantics).
   * Intentionally NOT the system X11 clipboard: HomePane's transfer handler
   * never attaches in our boot path, and a JVM-local buffer keeps runs
   * deterministic in CI.
   */
  public byte[] clipboardBytes() {
    return clipboardBytes;
  }

  public void setClipboardBytes(byte[] bytes) {
    this.clipboardBytes = bytes;
  }

  /**
   * Runs task on the EDT and returns its result, rethrowing any exception.
   * If already on the EDT runs directly.
   */
  public <T> T callOnEdt(java.util.concurrent.Callable<T> task) {
    if (EventQueue.isDispatchThread()) {
      try {
        return task.call();
      } catch (Exception e) {
        throw new RuntimeException(e.getMessage(), e);
      }
    }
    final Object[] result = new Object[1];
    final Exception[] failure = new Exception[1];
    try {
      EventQueue.invokeAndWait(() -> {
        try {
          result[0] = task.call();
        } catch (Exception e) {
          failure[0] = e;
        }
      });
    } catch (Exception e) {
      throw new RuntimeException(e.getMessage(), e);
    }
    if (failure[0] != null) {
      throw new RuntimeException(
          failure[0].getMessage() == null
              ? failure[0].getClass().getSimpleName()
              : failure[0].getMessage(),
          failure[0]);
    }
    @SuppressWarnings("unchecked")
    T typed = (T) result[0];
    return typed;
  }

  public boolean isUiReady() {
    return frameController != null;
  }

  /** The frame controller of the currently displayed window (null before boot). */
  public HomeFrameController frameController() {
    return frameController;
  }

  public String version() {
    try {
      return getVersion();
    } catch (RuntimeException e) {
      return "7.5";
    }
  }

  private void attachRenderingErrorLogger() {
    try {
      Component3DManager.getInstance().setRenderingErrorObserver(
          (errorCode, errorMessage) ->
              System.err.println("[driver] 3D rendering error " + errorCode + ": " + errorMessage));
    } catch (Throwable t) {
      System.err.println("[driver] could not install rendering error observer: " + t);
    }
  }
}
