#include <iostream>
#include <C:/xampp/htdocs/hr-proto/include/nlohmann/json.hpp>
using json = nlohmann::json;

int main() {
    json employees;
    std::cin >> employees;

    for (auto &emp : employees) {
        int hours = emp.value("hoursWorked", 0);
        int difficulty = emp.value("difficulty", 1);
        int projects = emp.value("projectsCompleted", 0);

        int score = (hours / 10) + (difficulty * 5) + (projects * 20);
        emp["score"] = score;
    }

    std::cout << employees.dump(4);
    return 0;
}
