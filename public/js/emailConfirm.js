import axios from "axios";
import { showAlert } from "./alert";

export const emailConfirm = async (otp, email) => {
  try {
    const res = await axios({
      method: "POST",
      url: `/api/v1/users/verify-email`,
      data: {
        otp,
        email,
      },
    });

    if (res.data.status === "success") {
      showAlert("success", "Email verified successfully!");
      window.setTimeout(() => {
        location.assign("/login");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
