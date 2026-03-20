import { File } from "lucide-react";

export default function FileCard({ item, onSelect, selected }) {
    return (
        <div
            onClick={() => onSelect(item)}
            className={`group p-5 rounded-2xl border cursor-pointer transition
        ${selected ? "border-blue-500 bg-blue-50" : "bg-white"}
        hover:shadow-md hover:border-gray-300`}
        >
            <div className="flex justify-between items-start">

                <File className="w-12 h-12 text-gray-300" />

            </div>

            <p className="mt-4 text-sm font-medium truncate">
                {item.name}
            </p>

            <p className="text-xs text-gray-400 mt-1">
                {item.metadata?.size || "0 KB"}
            </p>
        </div>
    );
}