import { NextResponse } from "next/server";
import { getAdminMessaging } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const { title, body, topic, userIds, data } = await request.json();

    const messaging = getAdminMessaging();

    if (topic) {
      // Send to a topic (e.g., 'all-users', 'staff-chat')
      const message = {
        notification: {
          title,
          body,
        },
        topic,
        data: data || {},
      };

      const response = await messaging.send(message);
      return NextResponse.json({ success: true, messageId: response });
    }

    // You could expand this to handle userIds by looking up their FCM tokens in Firestore
    return NextResponse.json({ 
      success: false, 
      error: "Only topic-based notifications are currently implemented." 
    }, { status: 400 });

  } catch (error: any) {
    console.error("FCM Send Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Unknown error occurred" 
    }, { status: 500 });
  }
}
