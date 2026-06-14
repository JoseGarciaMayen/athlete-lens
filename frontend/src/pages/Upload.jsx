import { useState } from "react";
import UploadVertical from "../components/UploadVertical";
import UploadSprint from "../components/UploadSprint";
import UploadHorizontal from "../components/UploadHorizontal";

function Upload() {
    const [activeTab, setActiveTab] = useState("vertical");

    return (
        <div className="max-w-md mx-auto p-6 mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">

            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    className={`flex-1 py-2 text-center text-sm font-medium border-b-2 transition-colors ${activeTab === "vertical"
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600"
                        }`}
                    onClick={() => setActiveTab("vertical")}
                >
                    Vertical Jump
                </button>
                <button
                    className={`flex-1 py-2 text-center text-sm font-medium border-b-2 transition-colors ${activeTab === "horizontal"
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600"
                        }`}
                    onClick={() => setActiveTab("horizontal")}
                >
                    Horizontal Jump
                </button>
                <button
                    className={`flex-1 py-2 text-center text-sm font-medium border-b-2 transition-colors ${activeTab === "sprint"
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600"
                        }`}
                    onClick={() => setActiveTab("sprint")}
                >
                    Sprint
                </button>
            </div>

            <div className="mt-4">
                {activeTab === "vertical" && <UploadVertical />}
                {activeTab === "sprint" && <UploadSprint />}
                {activeTab === "horizontal" && <UploadHorizontal />}
            </div>
        </div>
    );
}

export default Upload;
