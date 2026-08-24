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

  public Sh3dApplication() {
    super();
    attachRenderingErrorLogger();
  }

  public void bootOnEdt() throws Exception {
    EventQueue.invokeAndWait(() -> {
      Home home = createHome();
      frameController = createHomeFrameController(home);
      frameController.displayView();
    });
  }

  public void newHomeOnEdt() throws Exception {
    EventQueue.invokeAndWait(() -> {
      Home freshHome = createHome();
      HomeFrameController previous = frameController;
      Window previousWindow = previous == null
          ? null
          : SwingUtilities.getWindowAncestor((Component) previous.getView());
      frameController = createHomeFrameController(freshHome);
      frameController.displayView();
      if (previousWindow != null) {
        previousWindow.dispose();
      }
    });
  }

  public boolean isUiReady() {
    return frameController != null;
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
