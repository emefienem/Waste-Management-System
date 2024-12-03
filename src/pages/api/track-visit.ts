import { ServerClient } from "postmark";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "POST") {
    const { url, timestamp } = req.body;

    const client = new ServerClient(process.env.POSTMARK_API_KEY as any);

    try {
      await client.sendEmail({
        From: "michael.emefienem210591138@st.lasu.edu.ng",
        To: "michael.emefienem210591138@st.lasu.edu.ng",
        Subject: "New Website Visitor",
        TextBody: `A user just visited your waste management system: ${url} at ${timestamp}`,
      });

      res.status(200).json({ message: "Notification sent!" });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error sending email:", error.message);
        return res.status(500).json({ message: error.message });
      } else {
        console.error("Unknown error:", error);
        return res
          .status(500)
          .json({ message: "An unexpected error occurred" });
      }
    }
  } else {
    return res.status(405).json({ message: "Method is not allowed" });
  }
}
