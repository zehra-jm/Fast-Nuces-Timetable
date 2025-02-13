    document.getElementById("searchBtn").addEventListener("click", searchClass);
    document.getElementById("downloadPdfBtn").addEventListener("click", downloadPdf);
    document.getElementById("fileInput").addEventListener("change", handleFileUpload);

    let timetableData = {}; 

    async function fetchTimetableData() {
        try {
            const response = await fetch("./Timetable.xlsx");
            if (!response.ok) {
                alert("Failed to load timetable data. Retry Loading if the issue persists Please mail codeweaveco@gmail.com ");
                return;
            }

            const arrayBuffer = await response.arrayBuffer();
            processUploadedFile(arrayBuffer);
        } catch (error) {
            alert("Failed to load timetable data. Retry Loading if the issue persists Please mail codeweaveco@gmail.com ");
        }
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const arrayBuffer = e.target.result;
                processUploadedFile(arrayBuffer);
            };
            reader.readAsArrayBuffer(file);
        }
    }

    function processUploadedFile(arrayBuffer) {
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        timetableData = {}; 

        workbook.SheetNames.forEach(sheetName => {
            if (["Reserved Days", "BS Senior City Campus"].includes(sheetName)) return;
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            timetableData[sheetName.trim()] = processSheetData(jsonData, sheetName.trim());
        });

    }

    window.onload = fetchTimetableData;

    function processSheetData(sheetData, day) {
        let daysData = [];
        let headers = sheetData[2]; 
        let classrooms = sheetData.slice(4);
        
        classrooms.forEach(row => {
            let venue = row[0];
            if (!venue) return;

            for (let i = 1; i < row.length; i++) {
                if (row[i]) {
                    let courseDetails = row[i].split("\n");
                    courseDetails.forEach(course => {
                        let startTime = headers[i] ? formatTime(headers[i].trim()) : "Unknown Time";
                        let endTime = calculateEndTime(startTime, course, day);
                        daysData.push({
                            slot: i,
                            time: startTime,
                            venue: venue.trim(),
                            classInfo: course.trim(),
                            endTime: endTime
                        });
                    });
                }
            }
        });

        return daysData;
    }


    function formatTime(timeStr) {
        let match = timeStr.match(/(\d+)(?::(\d+))?/);
        if (!match) return "00:00";
        let hours = parseInt(match[1], 10);
        let minutes = match[2] ? parseInt(match[2], 10) : 0;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    function calculateEndTime(startTime, course, day) {
        if (startTime === "Unknown Time") return "Unknown End Time";
        let [hours, minutes] = startTime.split(":").map(Number);
        let duration = (course.toLowerCase().includes("lab")) ? (day.toLowerCase().includes("thursday") || day.toLowerCase().includes("friday") ? 160 : 180) : 55; 
        let totalMinutes = hours * 60 + minutes + duration;
        let endHours = Math.floor(totalMinutes / 60);
        let endMinutes = totalMinutes % 60;
        if (endHours > 12) {
            endHours -= 12;
        }
        return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    }

    function searchClass() {
        const searchInput = document.getElementById("searchInput").value.trim();
        const resultsContainer = document.getElementById("results");
        resultsContainer.innerHTML = "";

        if (!searchInput) {
            resultsContainer.innerHTML = "<p>Please enter class names.</p>";
            return;
        }

        let searchTerms = searchInput.split(",").map(term => term.trim().toLowerCase());
        let resultsByDay = {};

        for (const [day, classes] of Object.entries(timetableData)) {
            let matchingClasses = classes.filter(entry =>
                searchTerms.some(term => entry.classInfo.toLowerCase().includes(term))
            );
            if (matchingClasses.length > 0) {
                matchingClasses.sort((a, b) => a.slot - b.slot);
                resultsByDay[day] = matchingClasses;
            }
        }

        if (Object.keys(resultsByDay).length === 0) {
            resultsContainer.innerHTML = "<p>No matches found.</p>";
            return;
        }

        document.getElementById("downloadPdfBtn").style.display = "block";
        for (const [day, entries] of Object.entries(resultsByDay)) {
            let dayBlock = document.createElement("div");
            dayBlock.classList.add("day-section");
            let dayTitle = document.createElement("h3");
            dayTitle.textContent = day;
            dayBlock.appendChild(dayTitle);
            let classList = document.createElement("ul");
            entries.forEach(entry => {
                let listItem = document.createElement("li");
                listItem.textContent = `||${entry.time}-${entry.endTime} || ${entry.venue} || ${entry.classInfo}||`;
                classList.appendChild(listItem);
            });
            dayBlock.appendChild(classList);
            resultsContainer.appendChild(dayBlock);
        }
    }

    function downloadPdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let yPos = 10;
        let pageHeight = doc.internal.pageSize.height;
        let margin = 10;
    
        doc.setFontSize(16);
        doc.text("Weekly Timetable", 20, yPos);
        yPos += 10;
    
        const resultsContainer = document.getElementById("results");
        const daySections = resultsContainer.getElementsByClassName("day-section");
    
        Array.from(daySections).forEach(daySection => {
            const dayTitle = daySection.getElementsByTagName("h3")[0].textContent;
            
            if (yPos + 10 > pageHeight - margin) {
                doc.addPage();
                yPos = 10; 
            }
    
            doc.setFontSize(14);
            doc.text(dayTitle, 20, yPos);
            yPos += 10;
    
            const classList = daySection.getElementsByTagName("ul")[0];
            Array.from(classList.getElementsByTagName("li")).forEach(classItem => {
                doc.setFontSize(12);
    
                if (yPos + 10 > pageHeight - margin) {
                    doc.addPage();
                    yPos = 10;
                }
    
                doc.text(classItem.textContent, 20, yPos);
                yPos += 10;
            });
        });
    
        doc.save("timetable.pdf");
    }
    
