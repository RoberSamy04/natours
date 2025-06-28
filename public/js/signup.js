/* eslint-disable */
import axios from "axios";
import { showAlert } from "./alert";

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: "POST",
      url: "/api/v1/users/signup",
      data: {
        name,
        email,
        password,
        passwordConfirm,
      },
    });

    if (res.data.status === "success") {
      showAlert(
        "success",
        "signed up  successfully ! Please confirm your Email"
      );
      window.setTimeout(() => {
        location.assign("/verify-email");
      }, 1500);
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
};
